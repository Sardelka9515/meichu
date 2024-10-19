import numpy as np
import pandas as pd
import os
import librosa
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import IPython
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from imblearn.over_sampling import RandomOverSampler
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import Dense, Activation, Dropout, Conv2D, MaxPool2D, Flatten
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping

test_real = "linus-to-musk-DEMO.mp3"

# Load the model, model.keras
model = load_model("model.keras")

def detect_fake(filename):
    try:
        sound_signal, sample_rate = librosa.load(filename, res_type="kaiser_fast")
        mfcc_features = librosa.feature.mfcc(y=sound_signal, sr=sample_rate, n_mfcc=40)
        mfccs_features_scaled = np.mean(mfcc_features.T, axis=0)
        mfccs_features_scaled = mfccs_features_scaled.reshape(1, -1)
        result_array = model.predict(mfccs_features_scaled)
        print(result_array)
        result_classes = ["FAKE", "REAL"]
        result = np.argmax(result_array[0])
        print("Result:", result_classes[result])
    except Exception as e:
        print(f"Error processing {filename}: {e}")

detect_fake(test_real)