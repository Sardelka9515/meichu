### api docs

1. /api/analyze/audio
   POST form-data (Key: "file", Value: mp3File) (only allow 1 data)

2. /api/analyze/image (EXPIRED)
   POST form-data (Key: "file", Value: imageFile) (only allow 1 data)
3. /api/analyze/img
   POST form-data (Key: "img", Value: imageFile) (only allow 1 data)
   NOTE: If output\_{MODEL_NAME} value is 0, it means, the model can't identify it

Notes:
lgrad

Ports:
5005 main
3002 db
3003 db
6379 db
3300 db

5000 voice
