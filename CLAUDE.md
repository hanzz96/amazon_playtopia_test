# CLAUDE.md
 
## Aturan umum ECC
 
Project ini memakai ECC (plugin `ecc@ecc`). Untuk task yang ada di tabel bawah, WAJIB pakai skill/command ECC yang sesuai sebelum mulai mengerjakan. Jangan langsung coding tanpa melewati langkah workflow-nya.
 
- Bentuk plugin: `/ecc:nama-command`. Kalau tidak dikenali, coba bentuk pendek (`/nama-command`) karena instalasi manual memakai bentuk itu.
- Skill adalah permukaan workflow utama. Slash command adalah jalan pintas.
- Kalau skill/command yang dibutuhkan tidak ditemukan, beri tahu saya. Jangan diam-diam diganti dengan cara lain.
## Pilih workflow berdasarkan task
 
| Task | Pakai | Agent |
|---|---|---|
| Membuat fitur baru | `/ecc:plan "deskripsi fitur"`, lalu skill `tdd-workflow` | planner, tdd-guide |
| Desain arsitektur sistem | `/ecc:plan` + agent architect | architect |
| Menulis kode dengan test dulu | skill `tdd-workflow` | tdd-guide |
| Memperbaiki bug | Buat failing test yang mereproduksi bug, lalu skill `tdd-workflow` | tdd-guide |
| Review kode yang baru ditulis | `/code-review` (fresh context) | code-reviewer |
| Triage GitHub issue | `/ecc:issue-review <nomor>` (atau `/issue-review <nomor>` kalau manual install) | skill issue-review |
| Build gagal | `/build-fix` | build-error-resolver |
| Test end-to-end | skill `e2e-testing` | e2e-runner |
| Cek celah keamanan | `/security-scan` | security-reviewer |
| Hapus dead code / bersih-bersih | `/refactor-clean` | refactor-cleaner |
| Update dokumentasi | `/update-docs` | doc-updater |
| Review kode Go | `/go-review` | go-reviewer |
| Review kode Python | `/python-review` | python-reviewer |
| Review kode TypeScript/JavaScript | panggil agent `typescript-reviewer` langsung | typescript-reviewer |
| Review kode F# | panggil agent `fsharp-reviewer` langsung | fsharp-reviewer |
| Pengembangan HarmonyOS | panggil agent `harmonyos-app-resolver` langsung | harmonyos-app-resolver |
| Review perubahan ML production | skill `mle-workflow` + agent `mle-reviewer` | mle-reviewer |
| Audit query database | otomatis didelegasikan | database-reviewer |
| Cek coverage test | `/test-coverage` (target minimal 80%) | |
 
## Alur standar
 
**Fitur baru**
1. `/ecc:plan "..."` untuk blueprint implementasi.
2. Skill `tdd-workflow`: tulis test dulu, baru implementasi.
3. `/code-review` sebelum dianggap selesai.
**Bug fix**
1. Reproduksi bug dengan failing test (skill `tdd-workflow`).
2. Implementasi fix, pastikan test lulus.
3. `/code-review` untuk menangkap regresi.
**Siap production**
1. `/security-scan` (audit OWASP Top 10).
2. Skill `e2e-testing` untuk alur user yang kritis.
3. `/test-coverage`, pastikan minimal 80%.
## Manajemen sesi
 
- Konteks mulai penuh: `/context-budget`.
- Mengakhiri sesi panjang: `/save-session` atau `/learn-eval`.
- Melanjutkan di lain waktu: `/resume-session`.
- Audit konfigurasi agent: `/security-scan` dengan scanner yang sudah direview, atau `agentshield scan --path .`.
## Catatan
 
- Jangan pakai shim lama seperti `/tdd` dan `/eval` (ada di `legacy-command-shims/`, hanya untuk opt-in eksplisit). Pakai skill `tdd-workflow`.
- Cek instalasi dengan `/plugin list ecc@ecc`.
 # CLAUDE.md
 
## Aturan umum ECC
 
Project ini memakai ECC (plugin `ecc@ecc`). Untuk task yang ada di tabel bawah, WAJIB pakai skill/command ECC yang sesuai sebelum mulai mengerjakan. Jangan langsung coding tanpa melewati langkah workflow-nya.
 
- Bentuk plugin: `/ecc:nama-command`. Kalau tidak dikenali, coba bentuk pendek (`/nama-command`) karena instalasi manual memakai bentuk itu.
- Skill adalah permukaan workflow utama. Slash command adalah jalan pintas.
- Kalau skill/command yang dibutuhkan tidak ditemukan, beri tahu saya. Jangan diam-diam diganti dengan cara lain.
## Pilih workflow berdasarkan task
 
| Task | Pakai | Agent |
|---|---|---|
| Membuat fitur baru | `/ecc:plan "deskripsi fitur"`, lalu skill `tdd-workflow` | planner, tdd-guide |
| Desain arsitektur sistem | `/ecc:plan` + agent architect | architect |
| Menulis kode dengan test dulu | skill `tdd-workflow` | tdd-guide |
| Memperbaiki bug | Buat failing test yang mereproduksi bug, lalu skill `tdd-workflow` | tdd-guide |
| Review kode yang baru ditulis | `/code-review` (fresh context) | code-reviewer |
| Triage GitHub issue | `/ecc:issue-review <nomor>` (atau `/issue-review <nomor>` kalau manual install) | skill issue-review |
| Build gagal | `/build-fix` | build-error-resolver |
| Test end-to-end | skill `e2e-testing` | e2e-runner |
| Cek celah keamanan | `/security-scan` | security-reviewer |
| Hapus dead code / bersih-bersih | `/refactor-clean` | refactor-cleaner |
| Update dokumentasi | `/update-docs` | doc-updater |
| Review kode Go | `/go-review` | go-reviewer |
| Review kode Python | `/python-review` | python-reviewer |
| Review kode TypeScript/JavaScript | panggil agent `typescript-reviewer` langsung | typescript-reviewer |
| Review kode F# | panggil agent `fsharp-reviewer` langsung | fsharp-reviewer |
| Pengembangan HarmonyOS | panggil agent `harmonyos-app-resolver` langsung | harmonyos-app-resolver |
| Review perubahan ML production | skill `mle-workflow` + agent `mle-reviewer` | mle-reviewer |
| Audit query database | otomatis didelegasikan | database-reviewer |
| Cek coverage test | `/test-coverage` (target minimal 80%) | |
 
## Alur standar
 
**Fitur baru**
1. `/ecc:plan "..."` untuk blueprint implementasi.
2. Skill `tdd-workflow`: tulis test dulu, baru implementasi.
3. `/code-review` sebelum dianggap selesai.
**Bug fix**
1. Reproduksi bug dengan failing test (skill `tdd-workflow`).
2. Implementasi fix, pastikan test lulus.
3. `/code-review` untuk menangkap regresi.
**Siap production**
1. `/security-scan` (audit OWASP Top 10).
2. Skill `e2e-testing` untuk alur user yang kritis.
3. `/test-coverage`, pastikan minimal 80%.
## Manajemen sesi
 
- Konteks mulai penuh: `/context-budget`.
- Mengakhiri sesi panjang: `/save-session` atau `/learn-eval`.
- Melanjutkan di lain waktu: `/resume-session`.
- Audit konfigurasi agent: `/security-scan` dengan scanner yang sudah direview, atau `agentshield scan --path .`.
## Catatan
 
- Jangan pakai shim lama seperti `/tdd` dan `/eval` (ada di `legacy-command-shims/`, hanya untuk opt-in eksplisit). Pakai skill `tdd-workflow`.
- Cek instalasi dengan `/plugin list ecc@ecc`.
 