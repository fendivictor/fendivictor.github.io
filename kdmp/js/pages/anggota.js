// js/pages/anggota.js

// Fungsi untuk menyembunyikan/menampilkan input Nama Warung
function toggleWarungField() {
    const jenis = $('#a-jenis').val();
    if (jenis === 'warung_mitra') {
        $('#field-nama-warung').slideDown();
        $('#a-warung').prop('required', true);
    } else {
        $('#field-nama-warung').slideUp();
        $('#a-warung').prop('required', false).val('');
    }
}

const AnggotaPage = {
    currentPage: 0,
    pageSize: 10,
    searchKeyword: '',
    searchTimer: null,

    init: function() {
        $('#tab-label').text('Data Anggota Koperasi');
        $('#filter-area').hide(); // Sembunyikan search produk
        this.fetchAnggota();
        this.renderSearchUI();
    },

    renderSearchUI: function() {
        const html = `
            <div class="row g-2 mb-3">
                <div class="col">
                    <div class="input-group shadow-sm">
                        <span class="input-group-text bg-white border-0"><i class="bi bi-search"></i></span>
                        <input type="text" id="anggota-search" class="form-control border-0" placeholder="Cari nama warga atau warung..." value="${this.searchKeyword}">
                    </div>
                </div>
            </div>
        `;
        $('#filter-area').html(html).show();

        // Event listener dengan debounce 500ms
        $('#anggota-search').on('input', (e) => {
            this.searchKeyword = e.target.value;
            this.currentPage = 0; // Kembalikan ke halaman 1 setiap kali mengetik
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.fetchAnggota();
            }, 500);
        });
    },

    // 3. Update Fetch menggunakan limit (range) dan filter (ilike)
    fetchAnggota: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        const from = this.currentPage * this.pageSize;
        const to = from + this.pageSize - 1;

        // Base query
        let query = sb.from('anggota_koperasi')
            .select('*', { count: 'exact' });

        // Jika ada keyword, cari di kolom nama_lengkap ATAU nama_warung
        if (this.searchKeyword) {
            query = query.or(`nama_lengkap.ilike.%${this.searchKeyword}%,nama_warung.ilike.%${this.searchKeyword}%`);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            return $('#main-content').html(`<p class="text-danger py-5 text-center">${error.message}</p>`);
        }

        this.renderList(data, count);
    },

    // 4. Pisahkan fungsi render list agar lebih rapi
    renderList: function(data, totalCount) {
        let html = ``;

        (data || []).forEach(a => {
            const badgeClass = a.jenis_anggota === 'warung_mitra' ? 'bg-primary' : 'bg-secondary';
            const labelJenis = a.jenis_anggota === 'warung_mitra' ? 'Warung Mitra' : 'Warga';
            const infoTambahan = a.jenis_anggota === 'warung_mitra' && a.nama_warung ? `<small class="text-primary fw-bold d-block mb-1"><i class="bi bi-shop"></i> ${a.nama_warung}</small>` : '';

            html += `
                <div class="card p-3 mb-2 border-0 shadow-sm" style="border-radius:15px;">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="badge ${badgeClass} mb-2">${labelJenis}</span>
                            ${infoTambahan}
                            <h6 class="fw-800 mb-0">${a.nama_lengkap}</h6>
                            <small class="text-muted"><i class="bi bi-whatsapp"></i> ${a.no_hp}</small>
                        </div>
                        <button class="btn btn-sm btn-light border-0 text-danger" onclick="AnggotaPage.delete('${a.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        if (!data || data.length === 0) {
            html += '<p class="text-center py-5 opacity-50">Data anggota tidak ditemukan</p>';
        }

        // Cetak tombol pagination di paling bawah
        html += this.renderPagination(totalCount);
        $('#main-content').html(html);
    },

    // 5. Render navigasi Prev / Next
    renderPagination: function(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) return '';

        return `
            <div class="d-flex justify-content-between align-items-center mt-4 mb-5">
                <button class="btn btn-sm btn-outline-primary" 
                    ${this.currentPage === 0 ? 'disabled' : ''} 
                    onclick="AnggotaPage.changePage(${this.currentPage - 1})">Prev</button>
                <span class="small fw-bold text-muted">Halaman ${this.currentPage + 1} dari ${totalPages}</span>
                <button class="btn btn-sm btn-outline-primary" 
                    ${this.currentPage + 1 >= totalPages ? 'disabled' : ''} 
                    onclick="AnggotaPage.changePage(${this.currentPage + 1})">Next</button>
            </div>
        `;
    },

    changePage: function(newPage) {
        this.currentPage = newPage;
        this.fetchAnggota();
        window.scrollTo(0, 0); // Scroll ke atas setelah pindah halaman
    },

    delete: async function(id) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Anggota?',
            text: 'Data anggota koperasi ini akan dihapus secara permanen.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus'
        });

        if(isConfirmed) {
            await sb.from('anggota_koperasi').delete().eq('id', id);
            this.fetchAnggota();
        }
    }
};

// Listener untuk submit form
$(document).on('submit', '#formTambahAnggota', async function(e) {
    e.preventDefault();
    
    // Tombol loading
    const btn = $(this).find('button[type="submit"]');
    const originalText = btn.text();
    btn.text('Menyimpan...').prop('disabled', true);

    const payload = {
        desa_id: userDesaId,
        jenis_anggota: $('#a-jenis').val(),
        nik: $('#a-nik').val() || null,
        nama_lengkap: $('#a-nama').val(),
        nama_warung: $('#a-warung').val() || null,
        no_hp: $('#a-hp').val(),
        alamat: $('#a-alamat').val() || null
    };

    const { error } = await sb.from('anggota_koperasi').insert([payload]);

    btn.text(originalText).prop('disabled', false);

    if (error) {
        Swal.fire('Gagal', error.message, 'error');
    } else {
        $('#modalAnggota').modal('hide');
        this.reset();
        $('#field-nama-warung').hide(); // Reset UI state
        Swal.fire('Berhasil', 'Data anggota tersimpan', 'success');
        AnggotaPage.fetchAnggota();
    }
});