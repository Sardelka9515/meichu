# About this

This is the main backend server of this project, it deals with audio and image file, video is on another server. To start this, run:

cd backend

docker compose up -d

NOTE: After docker compose, the python container(named backend-python-main) depends on dev-db container, so it has a highly chance crash, manually restart it after db is ready and it will work normally.

### api docs

1. /api/analyze/audio
   POST form-data (Key: "file", Value: mp3File) (only allow 1 data)
2. /api/analyze/image (EXPIRED)
   POST form-data (Key: "file", Value: imageFile) (only allow 1 data)
3. /api/analyze/img
   POST form-data (Key: "img", Value: imageFile) (only allow 1 data)
   NOTE: If output\_{MODEL_NAME} value is 0, it means, the model can't identify it
