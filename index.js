const fs = require('fs').promises;

class WAVHeader {
  constructor(buffer) {
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.offset = 0;
    this.buffer = buffer;
  }

  readString(length) {
    const result = String.fromCharCode(...new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length));
    this.offset += length;
    return result.replace(/\0+$/, '');
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
    const header = {
      chunkId: this.readString(4),
      chunkSize: this.readUint32(),
      format: this.readString(4),
    };

    if (header.chunkId !== 'RIFF' || header.format !== 'WAVE') {
      throw new Error('Not a valid WAV file');
    }

    header.metadata = {};
    header.duration = 0;
    header.chapters = [];

    console.log('Parsing chunks:');
    while (this.offset < this.view.byteLength) {
      const subchunkId = this.readString(4);
      const subchunkSize = this.readUint32();
      console.log(`Found chunk: ${subchunkId}, size: ${subchunkSize}`);

      if (subchunkId === 'fmt ') {
        header.audioFormat = this.readUint16();
        header.numChannels = this.readUint16();
        header.sampleRate = this.readUint32();
        header.byteRate = this.readUint32();
        header.blockAlign = this.readUint16();
        header.bitsPerSample = this.readUint16();
        this.offset += subchunkSize - 16; // Skip any extra format bytes
      } else if (subchunkId === 'data') {
        header.dataChunkSize = subchunkSize;
        header.duration = subchunkSize / header.byteRate;
        break;
      } else if (subchunkId === 'bext') {
        Object.assign(header.metadata, this.parseBextChunk(subchunkSize));
      } else if (subchunkId === 'LIST') {
        const listType = this.readString(4);
        console.log(`  LIST type: ${listType}`);
        if (listType === 'INFO') {
          Object.assign(header.metadata, this.parseListInfo(subchunkSize - 4));
        } else if (listType === 'adtl') {
          this.parseAdtlChunk(subchunkSize - 4, header.chapters);
        } else {
          this.offset += subchunkSize - 4;
        }
      } else if (subchunkId === 'axml') {
        Object.assign(header.metadata, this.parseAxmlChunk(subchunkSize));
      } else {
        console.log(`  Skipping unknown chunk: ${subchunkId}`);
        this.offset += subchunkSize;
      }
    }

    return header;
  }

  parseBextChunk(size) {
    const bextData = {};
    bextData.description = this.readString(256);
    bextData.originator = this.readString(32);
    bextData.originatorReference = this.readString(32);
    bextData.originationDate = this.readString(10);
    bextData.originationTime = this.readString(8);
    bextData.timeReference = this.readUint32() + (this.readUint32() << 32);
    bextData.version = this.readUint16();
    bextData.umid = this.readString(64);
    bextData.loudnessValue = this.readUint16();
    bextData.loudnessRange = this.readUint16();
    bextData.maxTruePeakLevel = this.readUint16();
    bextData.maxMomentaryLoudness = this.readUint16();
    bextData.maxShortTermLoudness = this.readUint16();
    this.offset += 180; // Reserved bytes
    bextData.codingHistory = this.readString(size - 602);
    console.log('bext chunk data:', bextData);
    return bextData;
  }

  parseListInfo(size) {
    const metadata = {};
    const endOffset = this.offset + size;
    console.log('  Parsing LIST INFO chunk:');
    while (this.offset < endOffset) {
      const id = this.readString(4);
      const length = this.readUint32();
      const value = this.readString(length);
      console.log(`    ${id}: ${value}`);
      metadata[id] = value;
      if (length % 2 !== 0) this.offset++;
    }
    return metadata;
  }

  parseAdtlChunk(size, chapters) {
    const endOffset = this.offset + size;
    while (this.offset < endOffset) {
      const chunkId = this.readString(4);
      const chunkSize = this.readUint32();
      if (chunkId === 'labl' || chunkId === 'note') {
        const cuePointId = this.readUint32();
        const text = this.readString(chunkSize - 4);
        chapters.push({ cuePointId, text });
      } else {
        this.offset += chunkSize;
      }
    }
  }

  parseAxmlChunk(size) {
    const metadata = {};
    const xmlData = this.readString(size);
    console.log('axml chunk data:', xmlData);
    
    // Parse XML data for metadata
    const isrcMatch = xmlData.match(/<dc:identifier>ISRC:([^<]+)<\/dc:identifier>/);
    if (isrcMatch) {
      metadata.ISRC = isrcMatch[1];
      console.log(`Found ISRC: ${metadata.ISRC}`);
    }

    return metadata;
  }
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  } else {
    return `00:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}

async function getWAVInfo(fileName) {
  try {
    const data = await fs.readFile(fileName);
    const wavHeader = new WAVHeader(data);
    const header = wavHeader.parse();
    
    const bitrate = Math.round(data.length * 8 / header.duration / 1000);
    
    const result = {
      input: {
        fileName: fileName,
        metadata: {
          date: header.metadata.originationDate || '',
          creation_time: header.metadata.originationTime || '',
          time_reference: header.metadata.timeReference ? header.metadata.timeReference.toString() : '0',
          coding_history: header.metadata.codingHistory || '',
          title: header.metadata.INAM || '',
          artist: header.metadata.IART || '',
          TSRC: header.metadata.ISRC || '',
          album: header.metadata.IPRD || '',
          track: header.metadata.ITRK || ''
        },
        duration: formatDuration(header.duration),
        bitrate: `${bitrate} kb/s`,
        stream: {
          codec: 'pcm_s16le',
          codecTag: '[1][0][0][0] / 0x0001',
          sampleRate: `${header.sampleRate} Hz`,
          channels: header.numChannels,
          bitsPerSample: header.bitsPerSample,
          bitrate: `${Math.round(header.byteRate * 8 / 1000)} kb/s`
        }
      }
    };

    if (header.chapters.length > 0) {
      result.input.chapters = header.chapters.map((chapter, index) => ({
        id: index,
        timeBase: '1/1000',
        start: Math.floor(chapter.cuePointId * 1000 / header.sampleRate),
        end: index < header.chapters.length - 1 
          ? Math.floor(header.chapters[index + 1].cuePointId * 1000 / header.sampleRate)
          : Math.floor(header.duration * 1000),
        tags: { title: chapter.text }
      }));
    }

    // Parse coding_history for recording facility
    if (header.metadata.codingHistory) {
      const facilityMatch = header.metadata.codingHistory.match(/T=([^,]+)/);
      if (facilityMatch) {
        result.input.metadata.recording_facility = facilityMatch[1].trim();
      }
    }

    console.log('Final metadata:', result.input.metadata);
    return result;
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

getWAVInfo(filePath)
  .then(wavInfo => {
    console.log(JSON.stringify(wavInfo, null, 2));
  })
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });