# seq_text_analysis.py
"""
Sequential Word Frequency Analysis (10 Marks)
---------------------------------------------
Dataset columns: ProductId, UserId, ProfileName, HelpfulnessNumerator,
HelpfulnessDenominator, Score, Time, Summary, Text

Steps:
1. Load first 20,000 reviews
2. Clean text (lowercase, remove punctuation, stopwords)
3. Count word frequency using collections.Counter
4. Save top 20 words to seq_output.csv
5. Print total processing time
"""

import pandas as pd
import time
import string
from collections import Counter
from nltk.corpus import stopwords
import nltk

# Download stopwords (only first time)
nltk.download('stopwords', quiet=True)

def clean_text(text):
    """Lowercase, remove punctuation, remove stopwords."""
    stop_words = set(stopwords.words('english'))
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    words = text.split()
    words = [w for w in words if w not in stop_words]
    return words

def main():
    start_time = time.time()

    # Step 1: Load dataset (first 20,000 reviews)
    df = pd.read_csv("reviews.csv", delimiter="\t" if "\t" in open("reviews.csv").readline() else ",").head(20000)
    
    # Step 2: Extract words
    all_words = []
    for review in df['Text']:
        if isinstance(review, str):
            all_words.extend(clean_text(review))

    # Step 3: Count word frequencies
    word_counts = Counter(all_words)

    # Step 4: Top 20 most frequent words
    top_words = word_counts.most_common(20)

    # Step 5: Write to CSV
    pd.DataFrame(top_words, columns=["word", "frequency"]).to_csv("seq_output.csv", index=False)

    # Step 6: Print timing + summary
    total_time = time.time() - start_time
    print(f"Processed {len(df)} reviews in {total_time:.2f} seconds.")
    print("Top words:", ", ".join([f"{w}({c})" for w, c in top_words]))

if __name__ == "__main__":
    main()
