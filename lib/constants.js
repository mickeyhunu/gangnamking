const path = require('path');

const SUPPORTED_LANGUAGES = ['ko', 'en', 'zh', 'ja'];
const LANGUAGE_FLAGS = {
  ko: { src: '/images/flags/flag-ko.png', alt: '한국어' },
  en: { src: '/images/flags/flag-us.svg', alt: 'English' },
  zh: { src: '/images/flags/flag-cn.svg', alt: '中文' },
  ja: { src: '/images/flags/flag-jp.svg', alt: '日本語' },
};
const LANGUAGE_LOCALES = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
};
const DEFAULT_LANGUAGE = 'ko';
const IMAGE_FILE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const GANGNAM_KEYWORD = /강남/i;
const AREA_FILTER_DEFAULTS = {
  label: '지역 선택',
  all: '전체',
};
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_FLAGS,
  LANGUAGE_LOCALES,
  DEFAULT_LANGUAGE,
  IMAGE_FILE_EXTENSIONS,
  GANGNAM_KEYWORD,
  AREA_FILTER_DEFAULTS,
  PUBLIC_DIR,
};
