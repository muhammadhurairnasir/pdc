# parallel_text_analysis.py
"""
Parallel Text Processing using Multiprocessing (25 Marks)
---------------------------------------------------------
1. Splits dataset into chunks (per worker)
2. Each worker cleans text and counts words
3. Merges all local results (reduction)
4. Runs for 1, 2, 4, 8 workers and reports performance
"""

import pandas as pd
import time
import string
from collections import Counter
from multiprocessing import Pool
from nltk.corpus import stopwords
import nltk

# Download stopwords if not already present
nltk.download('stopwords', quiet=True)
stop_words = set(stopwords.words('english'))

# --- Function for cleaning text ---
def clean_text(text):
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    words = text.split()
    words = [w for w in words if w not in stop_words]
    return words

# --- Function executed by each worker ---
def process_chunk(text_list):
    local_counter = Counter()
    for review in text_list:
        if isinstance(review, str):
            local_counter.update(clean_text(review))
    return local_counter

# --- Main Program ---
def main():
    # Step 1: Load dataset
    df = pd.read_csv("reviews.csv", delimiter="\t" if "\t" in open("reviews.csv").readline() else ",").head(20000)
    reviews = df["Text"].tolist()

    # Step 2: Define worker counts to test
    workers_list = [1, 2, 4, 8]
    baseline_time = None

    results_table = []

    for workers in workers_list:
        # Split data into roughly equal chunks
        chunk_size = len(reviews) // workers
        chunks = [reviews[i:i + chunk_size] for i in range(0, len(reviews), chunk_size)]

        start_time = time.time()

        with Pool(processes=workers) as pool:
            local_counters = pool.map(process_chunk, chunks)

        # Reduction step: combine all local Counters
        global_counter = Counter()
        for c in local_counters:
            global_counter.update(c)

        total_time = time.time() - start_time

        # Baseline timing (1 worker)
        if workers == 1:
            baseline_time = total_time

        speedup = baseline_time / total_time
        efficiency = (speedup / workers) * 100

        results_table.append((workers, total_time, speedup, efficiency))

        # Print progress
        print(f"{workers} workers -> Time: {total_time:.2f}s | Speedup: {speedup:.2f}x | Efficiency: {efficiency:.1f}%")

    # Save results to CSV
    df_results = pd.DataFrame(results_table, columns=["Workers", "Time (s)", "Speedup", "Efficiency (%)"])
    df_results.to_csv("parallel_output.csv", index=False)

    # Print top 20 words (just once for the final global counter)
    top_words = global_counter.most_common(20)
    print("\nTop 20 Words:")
    for w, c in top_words:
        print(f"{w}: {c}")

if __name__ == "__main__":
    main()
