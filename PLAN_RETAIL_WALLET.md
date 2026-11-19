# Plan: Retail Wallet CLI

**Sumber spec**: [`PROBLEM_RETAIL_WALLET.md`](PROBLEM_RETAIL_WALLET.md)
**Workflow**: mengikuti [`CLAUDE.md`](CLAUDE.md): `/ecc:plan` (dokumen ini) → skill `tdd-workflow` → `/code-review`
**Status**: diimplementasikan. Asumsi sudah dikonfirmasi: FIFO, transfer masuk melunasi hutang otomatis, login satu kata, tanpa desimal. Belum dicommit.
**Kompleksitas**: Low–Medium (sekitar 3–4 jam termasuk tes)

## 1. Ringkasan kebutuhan

CLI Node.js (JavaScript, ESM) yang mensimulasikan wallet retail.

- **Command**: `login`, `deposit`, `withdraw`, `transfer`, `logout`.
- **Entry point**: `start.sh` executable di root. Script ini install dependency, build, lalu menjalankan CLI.
- **State**: hanya in-memory. Setiap `start.sh` mulai dari kosong, tanpa customer.
- **Hutang**: transfer yang melebihi balance menghasilkan hutang. Deposit dan transfer masuk melunasi hutang dulu. Transfer ke orang yang berhutang ke kita mengurangi hutangnya (netting) tanpa memindahkan uang.

### Tentang "fresh environment"

Aplikasi tidak boleh menyimpan data antar-run. Contoh: `login Emma` lalu `deposit 100`, proses dihentikan, `start.sh` dijalankan lagi, dan `login Emma` harus menampilkan balance `$0`. Karena itu semua data disimpan di memori proses (`Map`), tanpa file atau database. `node_modules` boleh dipakai ulang karena itu bukan data customer.

### Tentang user

Tidak ada register. `login [name]` membuat customer jika belum ada. Tidak ada password. Penerima `transfer` harus sudah pernah `login`.

## 2. Proses bisnis

| Proses | Langkah |
|---|---|
| **login N** | Buat customer jika belum ada, lalu cetak `Hello, N!`, balance, dan semua hutang (`Owed $X to …` dan `Owed $X from …`). |
| **deposit X** | Lunasi hutang secara FIFO, cetak `Transferred $a to Kreditor` per kreditor, sisa masuk balance, lalu cetak balance dan sisa hutang. |
| **withdraw X** | Jika `X ≤ balance`, kurangi balance. Jika tidak, tolak dan state tidak berubah. Tidak pernah membuat hutang. |
| **transfer T X** | (1) Jika T berhutang ke pengirim, kurangi hutang itu sebesar `min(hutang, X)` tanpa uang pindah. (2) Kirim `min(balance, sisa X)` ke T dan cetak `Transferred`. Jika T sendiri punya hutang, uang itu melunasinya dulu. (3) Sisa X menjadi hutang pengirim ke T. |
| **logout** | Cetak `Goodbye, N!` dan kosongkan sesi. |

### Invariant (harus ada tesnya)

- Balance tidak pernah negatif.
- Antara dua orang hanya ada hutang satu arah.
- Punya hutang berarti balance 0. Akibatnya orang yang berhutang tidak bisa withdraw sebelum deposit melunasi hutangnya.
- Total uang di sistem hanya berubah lewat deposit dan withdraw.

### Contoh: hutang ke dua kreditor

Kevin dengan balance $0 melakukan transfer yang melebihi balance:

```
$ transfer Emma 40
Your balance is $0
Owed $40 to Emma

$ transfer Carol 30
Your balance is $0
Owed $40 to Emma
Owed $30 to Carol

$ deposit 50
Transferred $40 to Emma
Transferred $10 to Carol
Your balance is $0
Owed $20 to Carol
```

Baris `Transferred` tidak dicetak saat tidak ada uang yang berpindah (balance $0 atau netting murni).

### withdraw vs transfer

| | `withdraw` | `transfer` |
|---|---|---|
| Uang pergi ke | Keluar sistem | Customer lain |
| Jika melebihi balance | Ditolak, state tidak berubah | Terkirim sebagian, sisanya jadi hutang |
| Bisa membuat hutang | Tidak | Ya |

## 3. Keputusan yang diasumsikan (default)

Spec diam soal hal-hal ini. Ubah sebelum implementasi jika tidak setuju.

| # | Keputusan | Default |
|---|---|---|
| 1 | Transfer masuk ke penerima yang punya hutang | Melunasi hutang penerima dulu secara otomatis, seperti deposit (**dikonfirmasi**) |
| 2 | `login` saat sudah login | Ditolak, minta logout dulu |
| 3 | Urutan pelunasan jika kreditor banyak | FIFO: hutang yang terbentuk paling awal dibayar paling dulu (**dikonfirmasi**) |
| 4 | Angka | **Hanya bilangan bulat positif.** Desimal (`0.01`, `12.5`) ditolak dengan pesan `Invalid amount. Use a positive whole number`. Nol, negatif, dan non-angka juga ditolak (**dikonfirmasi: desimal tidak perlu ditangani**) |
| 5 | Nama login | **Satu kata saja.** `login Johan Andreas` ditolak dengan `Usage: login [name]` dan tidak membuat customer. `transfer` juga persis dua argumen (**dikonfirmasi**) |
| 6 | Transfer ke nama yang belum ada | Ditolak, tidak auto-create |
| 7 | Prompt `$ ` | Dicetak saat interaktif (stdin adalah TTY), tidak dicetak saat input dipipe |
| 8 | Stack | JavaScript (ESM) dan test runner bawaan Node (`node:test`). Tanpa dependency runtime maupun dev, dan tanpa langkah build |

Catatan tambahan: nama bersifat case-sensitive (`emma` ≠ `Emma`). Wording pesan error dipilih sendiri karena spec tidak memberi contoh (`Insufficient balance`, `Customer not found`, `Please login first`).

## 4. Pattern grounding

Repo hanya berisi spec, `README.md`, dan `CLAUDE.md`, jadi tidak ada konvensi kode yang bisa ditiru. Struktur di bawah adalah pilihan baru. Satu-satunya acuan perilaku adalah example session di spec.

## 5. Fase implementasi

Fase 2 dan 3 dikerjakan dengan `tdd-workflow`: tes ditulis lebih dulu (RED), lalu implementasi (GREEN), lalu rapikan.

### Fase 1: Scaffold dan `start.sh`
- `package.json` (`"type": "module"`, script `test`, tanpa dependency) dan `.gitignore` (`node_modules`).
- `start.sh`: `cd "$(dirname "$0")"`, `npm install --no-audit --no-fund` (praktis no-op karena tanpa dependency, tapi memenuhi syarat "install dependency"), lalu `exec node src/index.js`. Output npm diarahkan ke stderr agar stdout CLI tetap bersih.
- `chmod +x start.sh` dan commit dengan executable bit.
- **Validasi**: `./start.sh < /dev/null` keluar dengan kode 0.

### Fase 2: Domain (TDD)
- Tulis tes dulu per aturan di bagian 2 dan tiap invariant, termasuk edge case: overpay, netting sebagian, hutang ke banyak kreditor, cascade pelunasan (A→B→C), withdraw ditolak.
- Implementasi `domain/money.js` (parse dan format bilangan bulat), `domain/errors.js` (kelas error dengan kode), `domain/wallet.js` (`login`, `deposit`, `withdraw`, `transfer` yang mengembalikan hasil terstruktur tanpa I/O). Transfer menghitung semua perubahan dulu baru menerapkannya, supaya atomik.
- **Validasi**: `npm test` (menjalankan `node --test`).

### Fase 3: CLI (TDD)
- Tulis **golden test** lebih dulu: memutar ulang seluruh example session dan membandingkan output baris per baris. Tambah tes parser untuk nama satu kata (multi-kata ditolak), desimal, input invalid, dan command tanpa login.
- Implementasi `cli/parser.js` (tokenisasi dan validasi argumen), `cli/format.js` (teks output), `cli/repl.js` (loop `readline`, berhenti rapi saat EOF), `index.js` (entry point).
- **Validasi**: `printf 'login Emma\ndeposit 100\nlogout\n' | ./start.sh`.

### Fase 4: Verifikasi end-to-end
- **Fresh-state test**: `start.sh` dijalankan dua kali berturut-turut, run kedua harus melihat Emma sebagai customer baru.
- `/test-coverage` dengan target minimal 80% (`node --test --experimental-test-coverage`).
- `/code-review` (dan agent `typescript-reviewer`) sebelum dianggap selesai.

### Fase 5: README
- Cara menjalankan, daftar command, contoh sesi, tabel keputusan di bagian 3, dan tautan ke dokumen ini.

## 6. File yang dibuat atau diubah

| File | Aksi |
|---|---|
| `start.sh`, `package.json`, `.gitignore` | CREATE |
| `src/domain/{money,errors,wallet}.js` | CREATE |
| `src/cli/{parser,format,repl}.js`, `src/index.js` | CREATE |
| `tests/*.test.js`, `tests/fixtures/example-session.txt` | CREATE |
| `README.md` | UPDATE |

## 7. Risiko

| Risiko | Level | Mitigasi |
|---|---|---|
| Format output tidak persis seperti contoh | HIGH | Golden test dari example session |
| Output npm bocor ke stdout dan merusak pencocokan | HIGH | Arahkan ke stderr, tes dengan pipe |
| Netting tidak mencetak `Transferred`, mudah terlewat | MEDIUM | Ada di golden test (Emma → Kevin 30) |
| `start.sh` gagal karena npm atau jaringan | LOW | Tanpa dependency, jadi tidak ada yang diunduh |
| Tanpa tipe statis, salah ketik nama field lolos sampai runtime | LOW | Tes menyeluruh, JSDoc pada fungsi domain, dan `/code-review` |
| Cascade pelunasan (A→B→C) | LOW | Test khusus. Total hutang selalu berkurang sehingga pasti berhenti |

## 8. Kriteria selesai

- [ ] Semua fase selesai
- [ ] `npm test` lulus, termasuk golden test
- [ ] Coverage minimal 80%
- [ ] `./start.sh` dijalankan dua kali: run kedua mulai dari kosong
- [ ] Output example session cocok dengan spec
- [ ] `/code-review` bersih
- [ ] README mencatat semua keputusan
