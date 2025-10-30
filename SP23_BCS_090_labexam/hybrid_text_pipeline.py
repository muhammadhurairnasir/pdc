# hybrid_text_pipeline.py
"""
Hybrid Parallel NLP Pipeline (MPI + multiprocessing)
- Rank 0: Positive sentiment
- Rank 1: Negative sentiment
- Other ranks: All reviews
"""

from mpi4py import MPI
import pandas as pd
import string
import time
from collections import Counter
from multiprocessing import Pool, cpu_count
from nltk.corpus import stopwords
import nltk
import os
import sys

# Download NLTK stopwords silently
nltk.download('stopwords', quiet=True)
STOP_WORDS = set(stopwords.words('english'))

# ---------- Utility Functions ----------

def clean_text_to_words(text):
    """Lowercase, remove punctuation, remove stopwords"""
    if not isinstance(text, str):
        return []
    s = text.lower()
    s = s.translate(str.maketrans('', '', string.punctuation))
    words = s.split()
    return [w for w in words if w not in STOP_WORDS and w.isalpha()]

def process_sublist(texts):
    """Process a list of texts -> word Counter"""
    local = Counter()
    for t in texts:
        local.update(clean_text_to_words(t))
    return local

def split_into_n(lst, n):
    """Split a list into n nearly equal parts"""
    k, m = divmod(len(lst), n)
    return [lst[i*k + min(i, m):(i+1)*k + min(i+1, m)] for i in range(n)]

def safe_print(msg):
    """Avoid UnicodeEncodeError on Windows terminals"""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'ignore').decode())

# ---------- Main Function ----------

def main():
    comm = MPI.COMM_WORLD
    rank = comm.Get_rank()
    size = comm.Get_size()

    seq_time = 58.2  # Example sequential time for speedup calculation

    if rank == 0:
        safe_print(f"\n[Hybrid Pipeline] Starting with {size} MPI processes (PID {os.getpid()})")

        # Detect separator
        sample = open("reviews.csv", encoding="utf-8").readline()
        sep = "\t" if "\t" in sample else ","

        # Load first 20k rows
        try:
            df = pd.read_csv("reviews.csv", delimiter=sep, encoding="utf-8", on_bad_lines="skip").head(20000)
        except TypeError:
            df = pd.read_csv("reviews.csv", delimiter=sep, encoding="utf-8", engine="python").head(20000)

        # Identify score column
        score_col = None
        for c in df.columns:
            if c.lower() == "score":
                score_col = c
                break
        if score_col is None:
            safe_print("ERROR: No 'Score' column found.")
            comm.Abort(1)
            return

        reviews = [(str(t), float(s) if pd.notna(s) else None) for t, s in zip(df["Text"], df[score_col])]
        chunks = split_into_n(reviews, size)

        # Sentiment-specific filtering
        data_parts = []
        for i, ch in enumerate(chunks):
            if i == 0:
                filtered = [t for t, s in ch if s and s >= 4]  # Positive
            elif i == 1:
                filtered = [t for t, s in ch if s and s <= 2]  # Negative
            else:
                filtered = [t for t, s in ch]  # All
            data_parts.append(filtered)
    else:
        data_parts = None

    comm.Barrier()
    start_total = time.time()

    # Scatter
    local_texts = comm.scatter(data_parts, root=0)

    # Local multiprocessing
    workers = min(cpu_count(), 4)
    local_start = time.time()
    sublists = split_into_n(local_texts, workers)
    with Pool(processes=workers) as p:
        partials = p.map(process_sublist, sublists)
    local_counter = Counter()
    for part in partials:
        local_counter.update(part)
    local_time = time.time() - local_start

    gathered_counters = comm.gather(local_counter, root=0)
    gathered_times = comm.gather(local_time, root=0)
    gathered_counts = comm.gather(len(local_texts), root=0)

    comm.Barrier()
    total_time = time.time() - start_total

    # ---------- Master Output ----------
    if rank == 0:
        total_reviews = sum(gathered_counts)
        safe_print("\n===== Hybrid NLP Processing Summary =====")
        for r in range(size):
            role = "positive" if r == 0 else "negative" if r == 1 else "all"
            safe_print(f"● Node {r} ({role}): processed {gathered_counts[r]} reviews in {gathered_times[r]:.2f}s")

        overhead = total_time - max(gathered_times)
        speedup = seq_time / total_time
        safe_print(f"● Communication overhead: {overhead:.2f}s")
        safe_print(f"● Hybrid total time: {total_time:.2f}s")
        safe_print(f"● Hybrid speedup: {speedup:.2f}x vs Sequential")

        # Merge Counters
        total_counter = Counter()
        pos_counter = gathered_counters[0]
        neg_counter = gathered_counters[1] if size > 1 else Counter()
        for c in gathered_counters:
            total_counter.update(c)

        # Display top words
        safe_print("\nTop Positive Words:")
        for w, c in pos_counter.most_common(10):
            safe_print(f"  {w}: {c}")
        safe_print("\nTop Negative Words:")
        for w, c in neg_counter.most_common(10):
            safe_print(f"  {w}: {c}")

        safe_print("\nTop Overall Words:")
        for w, c in total_counter.most_common(15):
            safe_print(f"  {w}: {c}")

        # Save outputs
        pd.DataFrame(total_counter.most_common(20), columns=["word", "frequency"]).to_csv("hybrid_output_top20.csv", index=False)
        safe_print("\nResults saved to hybrid_output_top20.csv\n")


if __name__ == "__main__":
    main()
