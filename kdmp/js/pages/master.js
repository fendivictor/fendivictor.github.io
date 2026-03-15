const MasterPage = {
    init: async function(title) {
        $('#stat-area').hide();
        $('#filter-area').hide();

        if (title === 'categories') {
            $('#tab-label').text('Master Kategori');
            this.fetchMasterData(title, 'Kategori');
        } else if (title === 'units') {
            $('#tab-label').text('Master Satuan');
            this.fetchMasterData(title, 'Satuan');
        } 
    },

    fetchMasterData: async function(table, label) {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success spinner-border-sm"></div></div>');
        
        const { data, error } = await sb.from(table).select('*').order('name');
        
        let html = `
            <div class="card border-0 shadow-sm mb-4" style="border-radius: 15px;">
                <div class="card-body">
                    <div class="input-group">
                        <input type="text" id="new-master-name" class="form-control border-0 bg-light" placeholder="Tambah ${label} Baru...">
                        <button class="btn btn-success" onclick="MasterPage.addMasterData('${table}')"><i class="bi bi-plus-lg"></i></button>
                    </div>
                </div>
            </div>
        `;

        (data || []).forEach(item => {
            html += `
                <div class="card border-0 shadow-sm mb-2" style="border-radius: 12px;">
                    <div class="card-body py-2 d-flex justify-content-between align-items-center">
                        <span class="fw-600" style="font-size: 0.85rem;">${item.name}</span>
                        <div class="d-flex gap-2">
                            <button class="btn btn-link text-primary p-0" onclick="MasterPage.editMasterData('${table}', '${item.id}', '${item.name}')"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-link text-danger p-0" onclick="MasterPage.deleteMasterData('${table}', '${item.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });

        $('#main-content').html(html || `<p class="text-center py-5">Belum ada data ${label}</p>`);
    },

    addMasterData: async function(table) {
        const name = $('#new-master-name').val();
        if(!name) return;
        const { error } = await sb.from(table).insert([{ name }]);
        if(!error) this.fetchMasterData(table);
    },

    deleteMasterData: async function(table, id) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Data?',
            text: "Produk dengan kategori/satuan ini mungkin akan terpengaruh.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33'
        });
        if (isConfirmed) {
            await sb.from(table).delete().eq('id', id);
            this.fetchMasterData(table);
        }
    },

    editMasterData: async function(table, id, oldName) {
        const { value: newName } = await Swal.fire({
            title: 'Edit Data',
            input: 'text',
            inputValue: oldName,
            showCancelButton: true
        });
        if (newName) {
            await sb.from(table).update({ name: newName }).eq('id', id);
            this.fetchMasterData(table);
        }
    },

    initDesa: function() {
        $('#stat-area').hide();
        $('#filter-area').hide();
        $('#tab-label').text('Manajemen Desa');
        this.fetchDesas();

        const btnAdd = `<button class="btn btn-success w-100 mb-3 py-2 fw-bold" onclick="MasterPage.openModalDesa()" style="border-radius:15px;">
                            <i class="bi bi-plus-circle me-2"></i> Tambah Desa
                        </button>`;
        $('#button-add-data').html(btnAdd); // Munculkan tombol sebelum list
    },

    openModalDesa: function() {
        $('#modalTambahDesa').modal('show');
    },

    fetchDesas: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success spinner-border-sm"></div></div>');
        const { data: desas, error } = await sb.from('desas').select('*').order('nama_desa');
        if (error) return alert(error.message);

        let html = '';
        desas.forEach(d => {
            html += `
            <div class="card desa-card border-0 shadow-sm mb-2">
                <div class="card-body p-3 d-flex align-items-center">
                    <div class="bg-success-subtle rounded-circle p-3 me-3 text-success">
                        <i class="bi bi-houses fs-5"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${d.nama_desa}</h6>
                        <small class="text-muted" style="font-size: 0.75rem;">ID: ${d.id} | ${d.admin_email}</small>
                    </div>
                    <i class="bi bi-chevron-right text-muted"></i>
                </div>
            </div>`;
        });
        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Belum ada desa terdaftar</p>');
    }
};

$(document).on('submit', '#formTambahDesa', async function(e) {
    e.preventDefault();
    const email = $('#new_email_desa').val(), pass = $('#new_password_desa').val(), id = $('#new_id_desa').val(), nama = $('#new_nama_desa').val();
    
    try {
        const { error: authErr } = await sbAdmin.auth.signUp({ email, password: pass, options: { data: { role: 'admin_desa', desa_id: id } } });
        if (authErr) throw authErr;
        const { error: dbErr } = await sb.from('desas').insert([{ id, nama_desa: nama, admin_email: email }]);
        if (dbErr) throw dbErr;

        Swal.fire('Berhasil!', `Desa ${nama} telah aktif.`, 'success');
        $('#modalTambahDesa').modal('hide');
        this.reset();
        MasterPage.fetchDesas();
        MasterPage.loadDesaFilter(); // Refresh dropdown
    } catch (err) { Swal.fire('Gagal', err.message, 'error'); }
});