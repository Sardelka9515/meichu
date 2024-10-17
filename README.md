https://hackmd.io/xx0IKcKET2GIk09rHw7fBQ

# API endpoints

## backend(video_detect)
Api key is required for all endpoints
`X-API-KEY: aWxvdmVzYXVzYWdl`
- /analyze/image
- /analyze/video
- /result/video

### /analyze/image 
- Method: POST
- Body: image file as `form-data`
- Returns: Confidence in prediceted human and artifical rate
```json
{
    "artificial": 0.5451675057411194,
    "human": 0.39750805497169495
}
```

### /analyze/video
- Method: POST
- Body: parameters as json
  - url: url of the video to download
  - async: returns immediatly and execute analysis in the background if set to true, use `/result/video?id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` to get the progress and result
  - Example:
    ```json
    {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "async": true
    }
    ```
- Returns: The video analysis task in json format, and the results if async is not set
  - id: id of the executing task which can be used to query status and results later
  - url: url used to download the video
  - status: `queued` | `downloading` | `extracting` | `analyzing` | `completed`
  - progress: progress of the current stage
  - results: analysis results of each extracted frame, as an array
    - human
    - artificial
    - image: url to the extracted frame
  - url_trimmed: url to the downloaded video section
  - Example:
  ```json
  {
      "id": "df8c8b1b-960c-485f-b00e-10d19a20b138",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "status": "completed",
      "results": [
        {
              "human": 0.538165271282196,
              "artificial": 0.4967421591281891,
              "image": "/uploads/df8c8b1b-960c-485f-b00e-10d19a20b138/19.jpg"
        }
      ],
      "progress": 1.0,
      "url_trimmed": "/uploads/df8c8b1b-960c-485f-b00e-10d19a20b138.webm"
  }
  ```

### /result/video
- Method: GET
- Query parameters:
  - id: id of the task as returned by `/analyze/video`
  - Example: `/result/video?id=df8c8b1b-960c-485f-b00e-10d19a20b138`
- Returns: same format as `/analyze/video`


