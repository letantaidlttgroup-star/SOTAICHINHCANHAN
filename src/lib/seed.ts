// Khởi tạo tối thiểu khi database trống: một ví "Tiền mặt" (số 0) + bộ
// danh mục mặc định để có thể ghi giao dịch ngay. KHÔNG có dữ liệu demo.
import { db, newId } from '../db/db';

export async function seedIfEmpty(): Promise<void> {
  const has = (await db.wallets.count()) > 0 || (await db.categories.count()) > 0;
  if (has) return;

  await db.wallets.add({
    id: newId(), name: 'Tiền mặt', type: 'cash', currencyCode: 'VND',
    initialBalance: 0, icon: 'wallet', colorHex: '#8A8F98',
    isArchived: false, sortOrder: 0, createdAt: Date.now(),
  });

  const cAn = newId();
  await db.categories.bulkAdd([
    { id: cAn, name: 'Ăn uống', icon: 'utensils', colorHex: '#E0705E', kind: 'expense' },
    { id: newId(), name: 'Cà phê', icon: 'coffee', colorHex: '#C98A5A', kind: 'expense', parentId: cAn },
    { id: newId(), name: 'Nhà hàng', icon: 'utensils', colorHex: '#E0705E', kind: 'expense', parentId: cAn },
    { id: newId(), name: 'Di chuyển', icon: 'car', colorHex: '#6E8FB0', kind: 'expense' },
    { id: newId(), name: 'Mua sắm', icon: 'shopping-bag', colorHex: '#C9A96A', kind: 'expense' },
    { id: newId(), name: 'Hóa đơn', icon: 'receipt', colorHex: '#8A8F98', kind: 'expense' },
    { id: newId(), name: 'Sức khỏe', icon: 'heart-pulse', colorHex: '#4FB286', kind: 'expense' },
    { id: newId(), name: 'Giải trí', icon: 'sparkles', colorHex: '#A98FC9', kind: 'expense' },
    { id: newId(), name: 'Khác', icon: 'tag', colorHex: '#9C9287', kind: 'expense' },
    { id: newId(), name: 'Lương', icon: 'landmark', colorHex: '#4FB286', kind: 'income' },
    { id: newId(), name: 'Thưởng', icon: 'sparkles', colorHex: '#C9A96A', kind: 'income' },
    { id: newId(), name: 'Đầu tư', icon: 'trending-up', colorHex: '#6E8FB0', kind: 'income' },
    { id: newId(), name: 'Khác', icon: 'tag', colorHex: '#9C9287', kind: 'income' },
  ]);
}
