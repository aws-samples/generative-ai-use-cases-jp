/* eslint-disable i18nhelper/no-jp-string */
import { convertToSafeFilename } from '../../../lambda/utils/fileNameUtils';

describe('convertToSafeFilename', () => {
  it('should return filename without hash when only ASCII characters', () => {
    const result = convertToSafeFilename('document.pdf');
    expect(result).toBe('document');
  });

  it('should return filename without hash for ASCII with allowed special chars', () => {
    const result = convertToSafeFilename('report-2024 (final)[v1].pdf');
    expect(result).toBe('report-2024 (final)[v1]');
  });

  it('should add hash when Japanese characters are present', () => {
    const result = convertToSafeFilename('資料.pdf');
    expect(result).toBe('___46a890b2');
  });

  it('should add hash when mixed Japanese and ASCII characters', () => {
    const result = convertToSafeFilename('report資料2024.pdf');
    expect(result).toBe('report__2024_f3805637');
  });

  it('should generate different hashes for different Japanese filenames with same length', () => {
    const result1 = convertToSafeFilename('資料.pdf');
    const result2 = convertToSafeFilename('書類.pdf');
    expect(result1).toBe('___46a890b2');
    expect(result2).toBe('___5c4aa342');
    expect(result1).not.toBe(result2);
  });

  it('should generate consistent hash for same filename', () => {
    const result1 = convertToSafeFilename('資料.pdf');
    const result2 = convertToSafeFilename('資料.pdf');
    expect(result1).toBe('___46a890b2');
    expect(result2).toBe('___46a890b2');
  });

  it('should handle filename without extension', () => {
    const result = convertToSafeFilename('document');
    expect(result).toBe('document');
  });

  it('should handle filename with multiple dots', () => {
    const result = convertToSafeFilename('report.final.pdf');
    expect(result).toBe('report_final_8d101382');
  });

  it('should replace special characters with underscore and add hash', () => {
    const result = convertToSafeFilename('file@#$.pdf');
    expect(result).toBe('file____cf25ced4');
  });

  // Bedrock rejects U+3000 (IDEOGRAPHIC SPACE) — it is not valid whitespace for Bedrock
  it('should replace zenkaku space (U+3000) with underscore', () => {
    const result = convertToSafeFilename('新規　資料.pdf');
    // U+3000 must be replaced, not passed through
    expect(result).not.toMatch(/\u3000/);
  });

  it('should produce a valid Bedrock filename for Windows default Japanese text file name', () => {
    // Windows creates this filename with U+3000 (ideographic space) by default in Japanese locale
    const result = convertToSafeFilename('新規　テキスト ドキュメント.txt');
    expect(result).not.toMatch(/\u3000/);
    // must not have consecutive whitespace
    expect(result).not.toMatch(/\s{2,}/);
  });

  it('should collapse consecutive spaces into one', () => {
    const result = convertToSafeFilename('report  2024.pdf');
    expect(result).not.toMatch(/ {2,}/);
  });

  it('should not produce leading or trailing spaces', () => {
    const result = convertToSafeFilename('　leading-trailing　.pdf');
    expect(result).not.toMatch(/^ | $/);
  });
});
