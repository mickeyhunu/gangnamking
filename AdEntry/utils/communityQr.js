const ECC_LEVELS = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

const MODE_INDICATOR = 0b0100; // byte mode

const GF_EXP = new Array(512);
const GF_LOG = new Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < GF_EXP.length; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
  GF_LOG[0] = 0;
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function buildGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = polyMultiply(poly, [1, GF_EXP[i]]);
  }
  return poly;
}

function polyMultiply(p, q) {
  const result = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      result[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return result;
}

function polyMod(data, generator) {
  const buffer = data.slice();
  for (let i = 0; i < data.length - generator.length + 1; i++) {
    const factor = buffer[i];
    if (factor === 0) continue;
    for (let j = 1; j < generator.length; j++) {
      buffer[i + j] ^= gfMul(generator[j], factor);
    }
  }
  return buffer.slice(buffer.length - (generator.length - 1));
}

// [version][errorLevel] => { totalCodewords, ecCodewordsPerBlock, group1: { blocks, dataCodewords }, group2: {...}}
const QR_CAPACITIES = [
  null,
  {
    L: { total: 26, ec: 7, group1: { blocks: 1, data: 19 }, group2: null },
    M: { total: 26, ec: 10, group1: { blocks: 1, data: 16 }, group2: null },
    Q: { total: 26, ec: 13, group1: { blocks: 1, data: 13 }, group2: null },
    H: { total: 26, ec: 17, group1: { blocks: 1, data: 9 }, group2: null },
  },
  {
    L: { total: 44, ec: 10, group1: { blocks: 1, data: 34 }, group2: null },
    M: { total: 44, ec: 16, group1: { blocks: 1, data: 28 }, group2: null },
    Q: { total: 44, ec: 22, group1: { blocks: 1, data: 22 }, group2: null },
    H: { total: 44, ec: 28, group1: { blocks: 1, data: 16 }, group2: null },
  },
  {
    L: { total: 70, ec: 15, group1: { blocks: 1, data: 55 }, group2: null },
    M: { total: 70, ec: 26, group1: { blocks: 1, data: 44 }, group2: null },
    Q: { total: 70, ec: 18, group1: { blocks: 2, data: 17 }, group2: null },
    H: { total: 70, ec: 22, group1: { blocks: 2, data: 13 }, group2: null },
  },
  {
    L: { total: 100, ec: 20, group1: { blocks: 1, data: 80 }, group2: null },
    M: { total: 100, ec: 18, group1: { blocks: 2, data: 32 }, group2: null },
    Q: { total: 100, ec: 26, group1: { blocks: 2, data: 24 }, group2: null },
    H: { total: 100, ec: 16, group1: { blocks: 4, data: 9 }, group2: null },
  },
  {
    L: { total: 134, ec: 26, group1: { blocks: 1, data: 108 }, group2: null },
    M: { total: 134, ec: 24, group1: { blocks: 2, data: 43 }, group2: { blocks: 2, data: 44 } },
    Q: { total: 134, ec: 18, group1: { blocks: 2, data: 15 }, group2: { blocks: 2, data: 16 } },
    H: { total: 134, ec: 22, group1: { blocks: 2, data: 11 }, group2: { blocks: 2, data: 12 } },
  },
  {
    L: { total: 172, ec: 18, group1: { blocks: 2, data: 68 }, group2: null },
    M: { total: 172, ec: 16, group1: { blocks: 4, data: 27 }, group2: null },
    Q: { total: 172, ec: 24, group1: { blocks: 4, data: 19 }, group2: null },
    H: { total: 172, ec: 28, group1: { blocks: 4, data: 15 }, group2: null },
  },
  {
    L: { total: 196, ec: 20, group1: { blocks: 2, data: 78 }, group2: null },
    M: { total: 196, ec: 18, group1: { blocks: 4, data: 31 }, group2: null },
    Q: { total: 196, ec: 18, group1: { blocks: 2, data: 14 }, group2: { blocks: 4, data: 15 } },
    H: { total: 196, ec: 26, group1: { blocks: 4, data: 13 }, group2: null },
  },
  {
    L: { total: 242, ec: 24, group1: { blocks: 2, data: 97 }, group2: null },
    M: { total: 242, ec: 22, group1: { blocks: 2, data: 38 }, group2: { blocks: 2, data: 39 } },
    Q: { total: 242, ec: 22, group1: { blocks: 4, data: 18 }, group2: { blocks: 2, data: 19 } },
    H: { total: 242, ec: 26, group1: { blocks: 4, data: 14 }, group2: { blocks: 2, data: 15 } },
  },
  {
    L: { total: 292, ec: 30, group1: { blocks: 2, data: 116 }, group2: null },
    M: { total: 292, ec: 22, group1: { blocks: 3, data: 36 }, group2: { blocks: 2, data: 37 } },
    Q: { total: 292, ec: 20, group1: { blocks: 4, data: 16 }, group2: { blocks: 4, data: 17 } },
    H: { total: 292, ec: 24, group1: { blocks: 4, data: 12 }, group2: { blocks: 4, data: 13 } },
  },
  {
    L: { total: 346, ec: 18, group1: { blocks: 2, data: 68 }, group2: { blocks: 2, data: 69 } },
    M: { total: 346, ec: 26, group1: { blocks: 4, data: 43 }, group2: { blocks: 1, data: 44 } },
    Q: { total: 346, ec: 24, group1: { blocks: 6, data: 19 }, group2: { blocks: 2, data: 20 } },
    H: { total: 346, ec: 28, group1: { blocks: 6, data: 15 }, group2: { blocks: 2, data: 16 } },
  },
];

function getCharCountBits(version) {
  if (version <= 9) return 8;
  if (version <= 26) return 16;
  return 16;
}

function chooseVersion(textLength, errorLevel) {
  for (let version = 1; version < QR_CAPACITIES.length; version++) {
    const info = QR_CAPACITIES[version]?.[errorLevel];
    if (!info) continue;
    const dataCapacity =
      info.total - info.ec * (info.group1.blocks + (info.group2?.blocks ?? 0));
    if (dataCapacity >= textLength + 2) {
      return version;
    }
  }
  throw new Error("텍스트를 인코딩할 수 있는 QR 버전을 찾을 수 없습니다.");
}

function writeBit(buffer, bitIndex, value) {
  const byteIndex = Math.floor(bitIndex / 8);
  const bitOffset = 7 - (bitIndex % 8);
  buffer[byteIndex] |= (value & 1) << bitOffset;
}

function buildData(version, errorLevel, bytes) {
  const info = QR_CAPACITIES[version][errorLevel];
  const totalDataBytes =
    info.group1.blocks * info.group1.data +
    (info.group2 ? info.group2.blocks * info.group2.data : 0);
  const dataBuffer = new Uint8Array(totalDataBytes);
  let bitIndex = 0;

  for (let i = 3; i >= 0; i--) {
    writeBit(dataBuffer, bitIndex++, (MODE_INDICATOR >> i) & 1);
  }

  const charCountBits = getCharCountBits(version);
  let charCount = bytes.length;
  for (let i = charCountBits - 1; i >= 0; i--) {
    writeBit(dataBuffer, bitIndex++, (charCount >> i) & 1);
  }

  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      writeBit(dataBuffer, bitIndex++, (byte >> i) & 1);
    }
  }

  const terminatorBits = Math.min(4, totalDataBytes * 8 - bitIndex);
  for (let i = 0; i < terminatorBits; i++) {
    writeBit(dataBuffer, bitIndex++, 0);
  }

  while (bitIndex % 8 !== 0) {
    writeBit(dataBuffer, bitIndex++, 0);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (bitIndex < totalDataBytes * 8) {
    const pad = padBytes[padIndex % 2];
    for (let i = 7; i >= 0; i--) {
      writeBit(dataBuffer, bitIndex++, (pad >> i) & 1);
    }
    padIndex++;
  }

  return splitIntoBlocks(dataBuffer, info);
}

function splitIntoBlocks(dataBuffer, info) {
  const blocks = [];
  let offset = 0;

  for (let i = 0; i < info.group1.blocks; i++) {
    blocks.push(dataBuffer.slice(offset, offset + info.group1.data));
    offset += info.group1.data;
  }
  if (info.group2) {
    for (let i = 0; i < info.group2.blocks; i++) {
      blocks.push(dataBuffer.slice(offset, offset + info.group2.data));
      offset += info.group2.data;
    }
  }

  const generator = buildGeneratorPoly(info.ec);
  const ecBlocks = blocks.map((block) => {
    const padded = new Uint8Array(block.length + generator.length - 1);
    padded.set(block, 0);
    const remainder = polyMod(Array.from(padded), generator);
    return Uint8Array.from(remainder);
  });

  const maxDataLength = Math.max(...blocks.map((b) => b.length));
  const maxEcLength = generator.length - 1;

  const result = [];
  for (let i = 0; i < maxDataLength; i++) {
    for (const block of blocks) {
      if (i < block.length) {
        result.push(block[i]);
      }
    }
  }
  for (let i = 0; i < maxEcLength; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) {
        result.push(ec[i]);
      }
    }
  }

  return Uint8Array.from(result);
}

const ALIGNMENT_PATTERN_COORDS = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
];

function createMatrix(version) {
  const size = 17 + version * 4;
  return new Array(size).fill(null).map(() => new Array(size).fill(null));
}

function placeFinderPatterns(matrix) {
  const size = matrix.length;
  const patterns = [
    { row: 0, col: 0 },
    { row: 0, col: size - 7 },
    { row: size - 7, col: 0 },
  ];
  for (const { row, col } of patterns) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[rr][cc] = true;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  }
}

function placeTimingPatterns(matrix) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    const bit = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = bit;
    if (matrix[i][6] === null) matrix[i][6] = bit;
  }
}

function placeAlignmentPatterns(matrix, version) {
  if (version <= 1) return;
  const coords = ALIGNMENT_PATTERN_COORDS[version - 1];
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === coords.length - 1) ||
        (i === coords.length - 1 && j === 0)
      ) {
        continue;
      }
      placeSingleAlignment(matrix, coords[i], coords[j]);
    }
  }
}

function placeSingleAlignment(matrix, row, col) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = row + r;
      const cc = col + c;
      if (matrix[rr]?.[cc] !== null) continue;
      const dist = Math.max(Math.abs(r), Math.abs(c));
      matrix[rr][cc] = dist !== 1;
    }
  }
}

function reserveFormatAndVersion(matrix, version) {
  const size = matrix.length;
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      matrix[8][i] = matrix[i][8] = false;
    }
  }
  for (let i = size - 8; i < size; i++) {
    matrix[8][i] = false;
    matrix[i][8] = false;
  }
  matrix[size - 8][8] = true;
  if (version >= 7) {
    // Version information not required for these sizes.
  }
}

function fillData(matrix, data) {
  const size = matrix.length;
  let row = size - 1;
  let col = size - 1;
  let direction = -1;
  let bitIndex = 0;

  while (col > 0) {
    if (col === 6) col--;

    let r = row;
    while (r >= 0 && r < size) {
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;
        if (matrix[r][currentCol] !== null) continue;
        const byteIndex = Math.floor(bitIndex / 8);
        const bit = (data[byteIndex] >> (7 - (bitIndex % 8))) & 1;
        matrix[r][currentCol] = Boolean(bit);
        bitIndex++;
      }
      r += direction;
    }

    row = r - direction;
    direction *= -1;
    col -= 2;
  }
}

const MASK_FUNCTIONS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyBestMask(matrix, data, errorLevel) {
  let bestMatrix = null;
  let bestPenalty = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < MASK_FUNCTIONS.length; mask++) {
    const copy = matrix.map((row) => row.slice());
    applyMask(copy, mask);
    const penalty = calculatePenalty(copy);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = copy;
      bestMask = mask;
    }
  }
  applyFormatInfo(bestMatrix, bestMask, errorLevel);
  return bestMatrix;
}

function applyMask(matrix, maskIndex) {
  const maskFunc = MASK_FUNCTIONS[maskIndex];
  const size = matrix.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === null) continue;
      if (isReserved(r, c, size)) continue;
      if (maskFunc(r, c)) {
        matrix[r][c] = !matrix[r][c];
      }
    }
  }
}

function isReserved(r, c, size) {
  if (r < 9 && c < 9) return true;
  if (r < 9 && c >= size - 8) return true;
  if (c < 9 && r >= size - 8) return true;
  if (r === 6 || c === 6) return true;
  return false;
}

function calculatePenalty(matrix) {
  const size = matrix.length;
  let penalty = 0;

  for (let r = 0; r < size; r++) {
    let runColor = matrix[r][0];
    let runLength = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) {
          penalty += 3 + (runLength - 5);
        }
        runColor = matrix[r][c];
        runLength = 1;
      }
    }
    if (runLength >= 5) penalty += 3 + (runLength - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = matrix[0][c];
    let runLength = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) {
          penalty += 3 + (runLength - 5);
        }
        runColor = matrix[r][c];
        runLength = 1;
      }
    }
    if (runLength >= 5) penalty += 3 + (runLength - 5);
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = matrix[r][c];
      if (
        color === matrix[r][c + 1] &&
        color === matrix[r + 1][c] &&
        color === matrix[r + 1][c + 1]
      ) {
        penalty += 3;
      }
    }
  }

  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) darkCount++;
    }
  }
  const totalModules = size * size;
  const darkRatio = Math.abs((darkCount * 100) / totalModules - 50) / 5;
  penalty += Math.floor(darkRatio) * 10;

  return penalty;
}

const FORMAT_INFO = {
  L: [
    0b111011111000100,
    0b001011010001001,
    0b101001011001000,
    0b011001110000101,
    0b110011000101111,
    0b000011101100010,
    0b100001100100011,
    0b010001001101110,
  ],
  M: [
    0b111001011110011,
    0b001001110111110,
    0b101011111111111,
    0b011011010110010,
    0b110001100011000,
    0b000001001010101,
    0b100011000010100,
    0b010011101011001,
  ],
  Q: [
    0b111110110101010,
    0b001110011100111,
    0b101100010100110,
    0b011100111101011,
    0b110110001000001,
    0b000110100001100,
    0b100100101001101,
    0b010100000000000,
  ],
  H: [
    0b111100001011111,
    0b001100100010010,
    0b101110101010011,
    0b011110000011110,
    0b110100110110100,
    0b000100011111001,
    0b100110010111000,
    0b010110111110101,
  ],
};

function applyFormatInfo(matrix, mask, errorLevel) {
  const format = FORMAT_INFO[errorLevel][mask];
  const size = matrix.length;
  for (let i = 0; i < 15; i++) {
    const bit = (format >> i) & 1;
    if (i < 6) {
      matrix[i][8] = Boolean(bit);
    } else if (i === 6) {
      matrix[i + 1][8] = Boolean(bit);
    } else if (i < 8) {
      matrix[size - 15 + i][8] = Boolean(bit);
    } else {
      matrix[8][size - 1 - (i - 8)] = Boolean(bit);
    }
  }
  for (let i = 0; i < 7; i++) {
    const bit = (format >> i) & 1;
    matrix[8][i < 6 ? i : i + 1] = Boolean(bit);
  }
  matrix[8][size - 8] = true;
}

export function createQrMatrix(text, { errorCorrection = "Q" } = {}) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const level = errorCorrection in ECC_LEVELS ? errorCorrection : "Q";
  const version = chooseVersion(bytes.length, level);

  const data = buildData(version, level, bytes);

  const matrix = createMatrix(version);
  placeFinderPatterns(matrix);
  placeTimingPatterns(matrix);
  placeAlignmentPatterns(matrix, version);
  reserveFormatAndVersion(matrix, version);
  fillData(matrix, data);
  return applyBestMask(matrix, data, level);
}

export function createQrSvgDataUri(text, options = {}) {
  const matrix = createQrMatrix(text, options);
  const margin = options.margin ?? 4;
  const darkColor = options.darkColor ?? "#000000";
  const lightColor = options.lightColor ?? "#ffffff";

  const size = matrix.length + margin * 2;
  const svgParts = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${lightColor}"/>`,
  ];

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (!matrix[r][c]) continue;
      const x = c + margin;
      const y = r + margin;
      svgParts.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${darkColor}"/>`);
    }
  }

  svgParts.push(`</svg>`);
  const svg = svgParts.join("");
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
