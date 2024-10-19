from flask import Flask, request, jsonify, render_template
import numpy as np
import librosa
from tensorflow.keras.models import load_model
import os

app = Flask(__name__)
model = load_model("model.keras")

def detect_fake(filename):
    try:
        sound_signal, sample_rate = librosa.load(filename, res_type="kaiser_fast")
        mfcc_features = librosa.feature.mfcc(y=sound_signal, sr=sample_rate, n_mfcc=40)
        mfccs_features_scaled = np.mean(mfcc_features.T, axis=0)
        mfccs_features_scaled = mfccs_features_scaled.reshape(1, -1)
        result_array = model.predict(mfccs_features_scaled)
        result_classes = ["FAKE", "REAL"]
        result = np.argmax(result_array[0])
        return result_classes[result], result_array[0].tolist()
    except Exception as e:
        return f"Error processing {filename}: {e}", []

@app.route('/')
def upload_file():
    return "It's voice api server."

@app.route('/uploader', methods=['POST'])
def uploader():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"})
    
    files = request.files.getlist('file')
    if not files:
        return jsonify({"error": "No selected file"})
    
    results = []
    for file in files:
        if file:
            filepath = os.path.join("uploads", file.filename)
            file.save(filepath)
            result_class, result_array = detect_fake(filepath)
            os.remove(filepath)
            results.append({"filename": file.filename, "result": result_class, "result_array": result_array})
    
    return jsonify(results)

if __name__ == '__main__':
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    app.run(debug=True)