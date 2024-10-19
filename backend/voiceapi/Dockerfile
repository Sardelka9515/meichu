FROM python:3.9
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir resampy librosa matplotlib seaborn tqdm IPython scikit-learn imblearn tensorflow flask
EXPOSE 5000
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
CMD ["flask", "run"]