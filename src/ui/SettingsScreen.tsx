import { useState } from 'react';
import { dateKey } from '../domain/date';
import { DEFAULT_PROFILE } from '../domain/types';
import { ensurePermission } from '../notifications/reminders';
import { useStore } from '../state/store';
import { ProfileForm } from './ProfileForm';
import { readFileText } from './readFile';

export default function SettingsScreen() {
  const profile = useStore((s) => s.data.profile);
  const settings = useStore((s) => s.data.settings);
  const { updateProfile, updateSettings, exportText, importText, resetAll } = useStore.getState();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportText()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-garden-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleNotifications = async (on: boolean) => {
    setMsg('');
    if (on && (await ensurePermission()) !== 'granted') {
      setMsg('Chưa được cấp quyền thông báo. Bạn vẫn nhận nhắc nhở trong ứng dụng khi mở lại.');
    }
    updateSettings({ notificationsEnabled: on });
  };

  return (
    <section className="stack">
      <h1>Hồ sơ và cài đặt</h1>

      <ProfileForm
        key={formVersion}
        initial={{ profile: profile ?? DEFAULT_PROFILE, habits: settings.habits, reminderTime: settings.reminderTime }}
        submitLabel="Lưu thay đổi"
        onSubmit={({ profile: p, habits, reminderTime }) => {
          updateProfile(p);
          updateSettings({ habits, reminderTime });
          setMsg('Đã lưu. Thay đổi áp dụng từ ngày mai.');
        }}
      />

      <label className="inline">
        <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => toggleNotifications(e.target.checked)} />
        Bật thông báo nhắc nhở
      </label>
      <p className="note">Nhắc nhở hoạt động tốt nhất khi ứng dụng được cài và đang mở nền. Khi bạn mở lại, ứng dụng vẫn nhắc nhẹ nhàng.</p>
      {msg && <p role="status">{msg}</p>}

      <div className="card stack">
        <strong>Dữ liệu của bạn</strong>
        <p className="note">Mọi dữ liệu chỉ nằm trên thiết bị này, không gửi đi đâu.</p>
        <button onClick={download}>Xuất dữ liệu</button>
        <label>Nhập dữ liệu
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const r = importText(await readFileText(file));
                setError(r.ok ? '' : r.error ?? '');
                if (r.ok) {
                  setMsg('Đã nhập dữ liệu.');
                  setFormVersion((v) => v + 1);
                }
              } catch {
                setError('Tệp không hợp lệ nên chưa thay đổi gì.');
              }
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {confirming ? (
          <div className="row">
            <button onClick={() => { resetAll(); setConfirming(false); }}>Xác nhận xóa</button>
            <button onClick={() => setConfirming(false)}>Hủy</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}>Xóa toàn bộ dữ liệu</button>
        )}
      </div>

      <p className="note">Gợi ý chỉ hỗ trợ xây dựng thói quen, không thay thế tư vấn y tế.</p>
    </section>
  );
}
