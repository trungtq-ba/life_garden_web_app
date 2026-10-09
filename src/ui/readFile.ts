/** Đọc nội dung chữ của tệp; dùng FileReader để chạy cả trên jsdom lẫn trình duyệt. */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được tệp'));
    reader.readAsText(file);
  });
}
