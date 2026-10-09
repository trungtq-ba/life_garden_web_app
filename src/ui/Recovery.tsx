import { useState } from 'react';
import { useStore } from '../state/store';
import { backupRaw } from '../state/storage';
import { readFileText } from './readFile';

export default function Recovery() {
  const importText = useStore((s) => s.importText);
  const resetAll = useStore((s) => s.resetAll);
  const [msg, setMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="page">
      <h1>Không đọc được dữ liệu đã lưu</h1>
      <p>Dữ liệu trên thiết bị có vẻ bị hỏng. Chúng tôi chưa xóa gì. Bạn có thể khôi phục từ tệp đã xuất trước đó hoặc bắt đầu lại.</p>
      <label>Khôi phục từ tệp
        <input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const r = importText(await readFileText(file));
              if (!r.ok) setMsg(r.error ?? '');
            } catch {
              setMsg('Tệp không hợp lệ nên chưa thay đổi gì.');
            }
          }}
        />
      </label>
      {msg && <p role="alert">{msg}</p>}
      {confirming ? (
        <div className="row">
          <button onClick={() => { backupRaw(); resetAll(); }}>Xác nhận bắt đầu lại</button>
          <button onClick={() => setConfirming(false)}>Hủy</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)}>Bắt đầu lại</button>
      )}
      {confirming && <p className="note">Chúng tôi sẽ giữ một bản sao dữ liệu cũ trên thiết bị trước khi bắt đầu lại.</p>}
    </main>
  );
}
