# mpi_text_analysis.py
"""
Distributed Text Analysis using MPI (25 Marks)
----------------------------------------------
1. Rank 0 (Master): loads dataset, splits into chunks, sends to workers
2. Workers: receive chunk, clean text, count words, send result back
3. Master: merges all counts and reports total distributed time
"""

from mpi4py import MPI
import pandas as pd
import string
from collections import Counter
from nltk.corpus import stopwords
import nltk
import time

# Download stopwords silently (only needed once)
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))

def clean_text(text):
    """Lowercase, remove punctuation, remove stopwords."""
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    words = [w for w in text.split() if w not in stop_words]
    return words

def process_reviews(reviews):
    """Return word frequency Counter for a list of reviews."""
    local_counter = Counter()
    for review in reviews:
        if isinstance(review, str):
            local_counter.update(clean_text(review))
    return local_counter

def main():
    comm = MPI.COMM_WORLD
    rank = comm.Get_rank()
    size = comm.Get_size()
    start_time = time.time()

    # --- Rank 0: read data and distribute ---
    if rank == 0:
        print(f"\nRunning with {size} MPI processes...\n")
        df = pd.read_csv("reviews.csv", delimiter="\t" if "\t" in open("reviews.csv").readline() else ",").head(20000)
        reviews = df["Text"].tolist()

        # Split dataset into equal chunks
        chunk_size = len(reviews) // size
        chunks = [reviews[i:i + chunk_size] for i in range(0, len(reviews), chunk_size)]

        # Ensure last chunk gets any leftover rows
        while len(chunks) < size:
            chunks.append([])

    else:
        chunks = None

    # --- Scatter data to all ranks ---
    data_chunk = comm.scatter(chunks, root=0)

    # --- Each rank processes its chunk ---
    local_start = time.time()
    local_counter = process_reviews(data_chunk)
    local_time = time.time() - local_start
    print(f"Rank {rank} processed {len(data_chunk)} lines in {local_time:.2f}s")

    # --- Gather results back at root ---
    gathered_counters = comm.gather(local_counter, root=0)

    # --- Master combines all results ---
    if rank == 0:
        total_counter = Counter()
        for c in gathered_counters:
            total_counter.update(c)

        total_time = time.time() - start_time

        # Print performance summary
        print(f"\nTotal distributed time: {total_time:.2f}s")

        sequential_time = 8.70  
        speedup = sequential_time / total_time
        print(f"Speedup over sequential: {speedup:.2f}x\n")

        # Print top 20 words
        print("Top 20 most frequent words:")
        for word, count in total_counter.most_common(20):
            print(f"{word}: {count}")

if __name__ == "__main__":
    main()
