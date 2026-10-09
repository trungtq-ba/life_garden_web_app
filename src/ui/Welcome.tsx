import { ALL_HABITS, DEFAULT_PROFILE } from '../domain/types';
import { useStore } from '../state/store';
import { ProfileForm } from './ProfileForm';

export default function Welcome() {
  const completeSetup = useStore((s) => s.completeSetup);
  return (
    <main className="page">
      <h1>Chào mừng đến Life Garden 🌱</h1>
      <p>Mỗi ngày làm vài việc nhỏ cho sức khỏe, khu vườn của bạn sẽ lớn dần. Bỏ lỡ một ngày cũng không sao.</p>
      <ProfileForm
        initial={{ profile: DEFAULT_PROFILE, habits: ALL_HABITS, reminderTime: '20:00' }}
        submitLabel="Bắt đầu"
        onSubmit={({ profile, habits, reminderTime }) => completeSetup(profile, { habits, reminderTime })}
      >
        <button
          type="button"
          onClick={() => completeSetup(DEFAULT_PROFILE, { habits: ALL_HABITS, reminderTime: '20:00' })}
        >
          Bỏ qua
        </button>
      </ProfileForm>
      <p className="note">Gợi ý chỉ hỗ trợ xây dựng thói quen, không thay thế tư vấn y tế. Dữ liệu của bạn chỉ nằm trên thiết bị này.</p>
    </main>
  );
}
