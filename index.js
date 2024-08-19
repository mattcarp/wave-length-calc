const fs = require('fs').promises;

class WAVHeader {
  constructor(buffer) {
    console.log("WAVHeader constructor called");
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.offset = 0;
  }

  readString(length) {
    const result = String.fromCharCode(...new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length));
    this.offset += length;
    return result;
  }

  readUint32() {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint16() {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  parse() {
    console.log("parse method called");
    const header = {
      chunkId: this.readString(4),
      chunkSize: this.readUint32(),
      format: this.readString(4),
      subchunk1Id: this.readString(4),
      subchunk1Size: this.readUint32(),
      audioFormat: this.readUint16(),
      numChannels: this.readUint16(),
      sampleRate: this.readUint32(),
      byteRate: this.readUint32(),
      blockAlign: this.readUint16(),
      bitsPerSample: this.readUint16(),
    };

    while (this.offset < this.view.byteLength - 8) {
      const subchunkId = this.readString(4);
      const subchunkSize = this.readUint32();
      if (subchunkId === 'data') {
        header.dataChunkSize = subchunkSize;
        break;
      }
      this.offset += subchunkSize;
    }

    return header;
  }
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

async function getWAVInfo(fileName) {
  try {
    console.log("Reading file:", fileName);
    const data = await fs.readFile(fileName);
    console.log("File read successfully. Creating WAVHeader instance.");
    const wavHeader = new WAVHeader(data);
    console.log("WAVHeader instance created. Calling parse method.");
    const header = wavHeader.parse();
    console.log("Parse method completed. Calculating duration.");
    
    const durationSeconds = header.dataChunkSize / (header.sampleRate * header.numChannels * (header.bitsPerSample / 8));
    
    return {
      fileName: fileName,
      fileFormat: header.format,
      fileSize: header.chunkSize + 8,
      audioFormat: header.audioFormat,
      numChannels: header.numChannels,
      sampleRate: header.sampleRate,
      byteRate: header.byteRate,
      bitsPerSample: header.bitsPerSample,
      duration: formatDuration(durationSeconds),
      "matt loves": "fiona!",
      "fiona loves": "doggies!"
    };
  } catch (error) {
    console.error("Error in getWAVInfo:", error);
    throw new Error(`Error reading WAV file: ${error.message}`);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a WAV file path as an argument');
  process.exit(1);
}

console.log("Starting script execution");
getWAVInfo(filePath)
  .then(wavInfo => {
    console.log(JSON.stringify(wavInfo, null, 2));
  })
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });
  