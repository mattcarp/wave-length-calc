# WAV File Analyzer

This Node.js script analyzes WAV audio files and provides detailed metadata information in JSON format, similar to ffprobe.

## Features

- Extracts metadata from WAV files, including:
  - File information
  - Audio properties
  - ISRC (TSRC) data
  - Recording facility information
- Outputs results in JSON format for easy parsing and integration

## Usage

```bash
node index.js path/to/your/wavfile.wav
```

## Example Output

```json
{
  "input": {
    "fileName": "example.wav",
    "metadata": {
      "date": "2024-01-26",
      "creation_time": "11:34:45",
      "time_reference": "0",
      "coding_history": "A=PCM,F=44100,W=16,M=stereo,T=Sonoris DDP Creator",
      "title": "",
      "artist": "",
      "TSRC": "USSM10703323",
      "album": "",
      "track": "",
      "recording_facility": "Sonoris DDP Creator"
    },
    "duration": "00:03:45.733",
    "bitrate": "1411 kb/s",
    "stream": {
      "codec": "pcm_s16le",
      "codecTag": "[1][0][0][0] / 0x0001",
      "sampleRate": "44100 Hz",
      "channels": 2,
      "bitsPerSample": 16,
      "bitrate": "1411 kb/s"
    }
  }
}
```

## Future Improvements

- Extract additional metadata (title, artist, album, track)
- Support for more audio file formats
- Web interface for file uploads and analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).