# ATURAN TIM (berlaku untuk semua akun pekerja)

Model kerja: 4 akun pekerja TIDAK saling terhubung dan TIDAK menyentuh repo. Masing-masing mengerjakan batch teks berbeda,
lalu hasilnya diperiksa dan digabung oleh pengontrol. Dengan begitu file tidak mungkin tumpang tindih.

1. Kerjakan HANYA batch yang dilampirkan di chat itu. Jangan menambah, mengurangi, atau menukar urutan baris.
2. Salin kolom pertama (kunci, mis. `h1_ai#1`) persis seperti aslinya. Satu baris input = satu baris output.
3. Keluaran hanya baris hasil. Tanpa pembuka, penutup, penomoran, judul, markdown, atau penjelasan.
4. Format baris hasil: `kunci | terjemahan` (pemisah: spasi, garis tegak, spasi). Jangan memakai garis tegak di dalam terjemahan.
5. Terjemahan = kalimat Indonesia yang wajar dan utuh, bukan arti per kata. Jangan menyalin kolom "arti per kata".
6. Jangan menulis hanzi atau bahasa Inggris di dalam terjemahan. Nama orang cukup ditulis latin (小明 → Xiaoming).
7. Akhiri kalimat dengan tanda baca (. ! ?). Pertahankan nada kalimat (tanya, seru, pernyataan).
8. Jangan mengubah hanzi atau pinyin, dan jangan membuat file, kode, atau struktur data sendiri.
9. Kalimat yang benar-benar tidak bisa dipahami: tulis `kunci | [PERIKSA]` — jangan menebak asal.
10. Jika jawaban terpotong karena batas panjang, pengguna mengetik `lanjut`; teruskan dari baris berikutnya tanpa mengulang.
11. Setelah hasil dikirim ke pengontrol, jangan mengerjakan ulang batch itu di chat lain.

Pengontrol menolak batch jika: ada kunci hilang/ganda, ada hanzi di terjemahan, terjemahan masih berbentuk arti per kata, atau format salah.
