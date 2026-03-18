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
    init: function() {
        $('#tab-label').text('Data Anggota Koperasi');
        $('#filter-area').hide(); // Sembunyikan search produk
        this.fetchAnggota();
    },

    fetchAnggota: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        // Tarik data khusus untuk desa admin yang sedang login
        const { data, error } = await sb.from('anggota_koperasi')
            .select('*')
            .order('created_at', { ascending: false });

        let html = ``;

        (data || []).forEach(a => {
            const badgeClass = a.jenis_anggota === 'warung_mitra' ? 'bg-primary' : 'bg-secondary';
            const labelJenis = a.jenis_anggota === 'warung_mitra' ? 'Warung Mitra' : 'Warga';
            const infoTambahan = a.jenis_anggota === 'warung_mitra' ? `<small class="text-primary fw-bold d-block mb-1"><i class="bi bi-shop"></i> ${a.nama_warung}</small>` : '';

            html += `
                <div class="card p-3 mb-2 border-0 shadow-sm" style="border-radius:15px;">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="badge ${badgeClass} mb-2">${labelJenis}</span>
                            ${infoTambahan}
                            <h6 class="fw-800 mb-0">${a.nama_lengkap}</h6>
                            <p class="text-muted"><i class="bi bi-location"></i> ${a.alamat}</p>
                            <small class="text-muted"><i class="bi bi-whatsapp"></i> ${a.no_hp}</small>
                        </div>
                        <button class="btn btn-sm btn-light border-0 text-danger" onclick="AnggotaPage.delete('${a.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Belum ada data anggota</p>');
    },

    delete: async function(id) {
        if(confirm('Hapus anggota ini?')) {
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