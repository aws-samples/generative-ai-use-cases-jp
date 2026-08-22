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

  // Bedrock rejects every whitespace character except a single ASCII space.
  // \s in a character class also matches U+3000 and tabs, so they used to pass through.
  it('should replace ideographic space (U+3000) with underscore', () => {
    const result = convertToSafeFilename('test\u3000name.pdf');
    expect(result).toBe('test_name_706fc6f2');
  });

  it('should replace ideographic space in an all-Japanese filename', () => {
    const result = convertToSafeFilename(
      '\u30c6\u30b9\u30c8\u3000\u8cc7\u6599.xlsx'
    );
    expect(result).toBe('_______9c852928');
  });

  it('should replace tab with underscore', () => {
    const result = convertToSafeFilename('test\tname.pdf');
    expect(result).toBe('test_name_38e78b48');
  });

  it('should collapse consecutive spaces into a single space', () => {
    const result = convertToSafeFilename('test  name.pdf');
    expect(result).toBe('test name_695fce01');
  });

  it('should keep a single space as is', () => {
    const result = convertToSafeFilename('test name.pdf');
    expect(result).toBe('test name');
  });

  it('should fall back to a placeholder when the name becomes empty', () => {
    const result = convertToSafeFilename('');
    expect(result).toBe('file_d41d8cd9');
  });
});
