# Plan: Retail Wallet CLI

**Sumber spec**: [`PROBLEM_RETAIL_WALLET.md`](PROBLEM_RETAIL_WALLET.md)
**Workflow**: mengikuti [`CLAUDE.md`](CLAUDE.md): `/ecc:plan` (dokumen ini) → skill `tdd-workflow` → `/code-review`
**Status**: selesai diimplementasikan dan dicommit di branch `feat/retail-wallet-cli` (72 tes lulus, coverage 99,8% baris). Empat keputusan sudah dikonfirmasi (FIFO, transfer masuk melunasi hutang otomatis, login satu kata, tanpa desimal). Sisanya masih default, lihat bagian 3.
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

## 3. Keputusan

Spec diam soal hal-hal ini. **Dikonfirmasi** berarti sudah dijawab. **Default** berarti asumsi saya yang masih menunggu konfirmasi dan mudah diubah (tes dulu, lalu kode).

| # | Topik | Keputusan | Status |
|---|---|---|---|
| 1 | Transfer masuk ke penerima yang punya hutang | Melunasi hutang penerima dulu secara otomatis, seperti deposit | Dikonfirmasi |
| 2 | `login` saat sudah login | Ditolak, minta logout dulu | Default |
| 3 | Urutan pelunasan jika kreditor banyak | FIFO: hutang yang terbentuk paling awal dibayar paling dulu. Menambah hutang ke kreditor yang sama tidak mengubah urutannya | Dikonfirmasi |
| 4 | Angka | Hanya bilangan bulat positif. Desimal (`0.01`, `12.5`), nol, negatif, dan non-angka ditolak. Uang disimpan sebagai dolar utuh | Dikonfirmasi |
| 5 | Nama login | Satu kata saja. `login Johan Andreas` ditolak dengan `Usage: login [name]` dan tidak membuat customer. `transfer` juga persis dua argumen | Dikonfirmasi |
| 6 | Transfer ke nama yang belum ada | Ditolak, tidak auto-create | Default |
| 7 | Prompt `$ ` | Dicetak saat interaktif (stdin dan stdout adalah TTY), tidak dicetak saat input dipipe | Default |
| 8 | Transfer ke diri sendiri | Ditolak | Default |
| 9 | Nama dan command | Nama case-sensitive (`emma` ≠ `Emma`). Command case-insensitive (`LOGIN Emma` berfungsi) | Default |
| 10 | Wording pesan error | Dipilih sendiri karena spec tidak memberi contoh, lihat katalog di bawah | Default |
| 11 | Stack | JavaScript (ESM) dan test runner bawaan Node (`node:test`). Tanpa dependency dan tanpa langkah build | Dikonfirmasi (permintaan pengguna) |
| 12 | Batas amount | Maksimal $10.000.000.000 (10000000000) per operasi `deposit`, `withdraw`, atau `transfer`. Lebih dari itu ditolak sebagai `INVALID_AMOUNT`. Total saldo customer tidak dibatasi | Default |

### Katalog pesan error

Semua error dicetak di stdout sebagai satu baris, dan state tidak berubah. Input baris diparse lebih dulu (command, jumlah argumen, format amount) sebelum cek login.

| Kode | Pesan | Kapan |
|---|---|---|
| `NOT_LOGGED_IN` | `Please login first` | `deposit`, `withdraw`, `transfer`, atau `logout` tanpa sesi |
| `ALREADY_LOGGED_IN` | `Already logged in as X. Please logout first` | `login` saat sudah login |
| `INVALID_NAME` | `Invalid name. Use a single word without spaces` | Penjaga di domain (parser sudah menolak lebih dulu) |
| `INVALID_AMOUNT` | `Invalid amount. Use a positive whole number` | Desimal, nol, negatif, non-angka, atau lebih dari batas |
| `INSUFFICIENT_BALANCE` | `Insufficient balance. Your balance is $X` | `withdraw` melebihi balance |
| `CUSTOMER_NOT_FOUND` | `Customer X not found` | `transfer` ke nama yang belum pernah login |
| `SELF_TRANSFER` | `You cannot transfer to yourself` | `transfer` ke diri sendiri |
| (usage) | `Usage: login [name]`, `Usage: deposit [amount]`, `Usage: withdraw [amount]`, `Usage: transfer [target] [amount]`, `Usage: logout` | Jumlah argumen salah |
| (usage) | `Unknown command: X. Available commands: login, deposit, withdraw, transfer, logout` | Command tidak dikenal |

### Batas dan non-goal

- **Batas amount**: maksimal 10.000.000.000 per operasi. Lebih dari itu ditolak sebagai `INVALID_AMOUNT`.
- **Non-goal**: persistensi data, password atau autentikasi, banyak sesi login bersamaan, riwayat transaksi, desimal dan mata uang lain.
- **Diketahui, sengaja tidak ditangani**: `EPIPE` jika stdout ditutup (misalnya `./start.sh | head`), dan total saldo yang secara teori bisa melewati `Number.MAX_SAFE_INTEGER` setelah sekitar 900.000 deposit di batas maksimum.

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
- README wajib memuat lima hal: (1) versi runtime yang dibutuhkan, (2) instruksi setup dan menjalankan, (3) instruksi menjalankan tes, (4) keputusan dan asumsi utama beserta statusnya, (5) keterbatasan yang diketahui dan pekerjaan yang belum selesai. README hanya berisi kelima bagian itu, tanpa bagian lain (tanpa daftar command terpisah, contoh sesi, atau layout).
- Portabilitas: `start.sh` memakai `#!/bin/sh` (tanpa bashism), `.gitattributes` memaksa LF, e2e di Windows lewat `bash start.sh` (dilewati dengan alasan jika bash tidak ada), dan `npm start` sebagai jalan tanpa shell. Terverifikasi lokal di macOS dan Linux (Alpine, Node 22). Windows lulus di CI `.github/workflows/test.yml` (Node 20, 22, 24; 72 tes, 0 dilewati), belum dicoba manual di mesin Windows.
- Versi Node minimum ditetapkan 20, karena tes dijalankan dan lulus di Node 20, 22, 24, dan 26. Node 18 tidak tersedia untuk diuji.

## 6. File yang dibuat atau diubah

| File | Aksi |
|---|---|
| `start.sh`, `package.json`, `.gitignore` | CREATE |
| `src/domain/{money,errors,wallet}.js` | CREATE |
| `src/cli/{parser,format,execute,repl}.js`, `src/index.js` | CREATE |
| `tests/*.test.js` (termasuk `e2e.test.js` lewat `start.sh`), `tests/helpers/transcript.js`, `tests/fixtures/{example,extended}-session.txt` | CREATE |
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

- [x] Semua fase selesai
- [x] `npm test` lulus, termasuk golden test (72 dari 72)
- [x] Coverage minimal 80% (99,8% baris, 98% branch, 100% fungsi)
- [x] `./start.sh` dijalankan dua kali: run kedua mulai dari kosong (ada di `tests/e2e.test.js`)
- [x] Output example session cocok dengan spec (golden test baris per baris)
- [x] `/code-review` tanpa temuan CRITICAL atau HIGH (satu MEDIUM sudah diperbaiki, lihat bagian 9)
- [x] README memuat lima hal wajib di atas, termasuk semua keputusan dan keterbatasan
- [ ] Keputusan berstatus Default (#2, #6, #7, #8, #9, #10, #12) dikonfirmasi

## 9. Hasil implementasi

- **Review**: `/code-review` mode lokal, dijalankan inline. Agent `typescript-reviewer` tidak dijalankan. Script lint dan typecheck tidak ada, jadi dilewati.
- **Temuan MEDIUM, sudah diperbaiki**: detail `{ name }` pada error menimpa `Error.name` sehingga nama error menjadi nama customer. Diperbaiki dengan TDD (tes gagal dulu), detail diganti `customer`.
- **Temuan LOW, sengaja tidak diperbaiki**: `EPIPE`, batas total saldo (lihat bagian 3), JSDoc belum lengkap di beberapa method publik, dan satu baris `default` di `execute.js` tidak tercover.
- **Perubahan setelah konfirmasi**: nama login jadi satu kata, desimal ditolak, uang dari sen ke dolar utuh, dan aturan "kata berisi angka saja ditolak" dihapus karena sudah tidak diperlukan.
- **Penyimpangan dari `CLAUDE.md`**: tidak ada checkpoint commit RED dan GREEN terpisah (seluruh pekerjaan satu commit), dan laporan bukti TDD belum ditulis. Perubahan setelah konfirmasi tidak ditinjau ulang dengan `/code-review`.
