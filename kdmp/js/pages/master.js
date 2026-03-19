const MasterPage = {
    init: async function(title) {
        $('#stat-area').hide();
        $('#filter-area').hide();
        $('#button-add-data').empty();

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
            const shortId = d.id.split('-')[0];
            html += `
            <div class="card desa-card border-0 shadow-sm mb-2">
                <div class="card-body p-3 d-flex align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${d.nama_desa}</h6>
                        <small class="text-muted" style="font-size: 0.75rem;">ID: ${shortId} | ${d.admin_email}</small>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-link text-primary p-0" onclick="MasterPage.editDesa('${d.id}', '${d.nama_desa}', '${d.auth_uid}', '${d.admin_email}')">
                            <i class="bi bi-pencil-square fs-5"></i>
                        </button>
                        <button class="btn btn-link text-danger p-0" onclick="MasterPage.deleteDesa('${d.id}', '${d.nama_desa}', '${d.auth_uid || ''}')">
                            <i class="bi bi-trash fs-5"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });
        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Belum ada desa terdaftar</p>');
    },

    editDesa: async function(id, oldName, authUid, oldEmail) {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Mitra Desa',
            html: `
                <div class="text-start">
                    <label class="small text-muted fw-bold">Nama Desa</label>
                    <input id="swal-nama" type="text" class="form-control mb-3" value="${oldName}">
                    
                    <hr class="opacity-25">
                    <small class="text-danger d-block mb-2">*Isi bagian bawah ini hanya jika ingin mengganti akses login</small>
                    
                    <label class="small text-muted fw-bold">Email Baru</label>
                    <input id="swal-email" type="email" class="form-control mb-2" value="${oldEmail}">
                    
                    <label class="small text-muted fw-bold">Password Baru</label>
                    <input id="swal-pass" type="password" class="form-control" placeholder="Minimal 6 karakter (Kosongkan jika tidak diganti)">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update Data',
            preConfirm: () => {
                return {
                    nama: document.getElementById('swal-nama').value,
                    email: document.getElementById('swal-email').value,
                    pass: document.getElementById('swal-pass').value
                }
            }
        });

        if (formValues) {
            Swal.showLoading();
            
            try {
                // 1. Update Auth di Supabase (Email & Password)
                if (authUid && authUid !== 'null' && authUid.trim() !== '') {
                    const updateData = { email: formValues.email };
                    
                    // Validasi khusus password Supabase (Minimal 6 karakter)
                    if (formValues.pass) {
                        if (formValues.pass.length < 6) {
                            throw new Error("Password baru minimal harus 6 karakter!");
                        }
                        updateData.password = formValues.pass;
                    }

                    // Wajib menggunakan sbAdmin dengan Service Role Key
                    const { error: authError } = await sbAdmin.auth.admin.updateUserById(
                        authUid, 
                        updateData
                    );
                    if (authError) throw authError;
                }

                // 2. Update Data di tabel public.desas
                const { error: dbError } = await sb.from('desas')
                    .update({ nama_desa: formValues.nama, admin_email: formValues.email })
                    .eq('id', id);
                if (dbError) throw dbError;

                Swal.fire({ icon: 'success', title: 'Berhasil Diupdate', timer: 1500, showConfirmButton: false });
                this.fetchDesas(); 
            } catch (err) {
                Swal.fire('Gagal', err.message, 'error');
            }
        }
    },

    deleteDesa: async function(id, nama, authUid) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Mitra Desa?',
            text: `Semua akses login dan operasional untuk ${nama} akan dihapus permanen. Lanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (isConfirmed) {
            Swal.showLoading();
            
            try {
                // 1. Hapus Akun Login dari auth.users Supabase (Wajib Service Role Key)
                if (authUid && authUid !== 'null' && authUid.trim() !== '') {
                    const { error: authErr } = await sbAdmin.auth.admin.deleteUser(authUid);
                    if (authErr) throw authErr;
                }

                // 2. Hapus Data dari tabel public.desas
                const { error: dbErr } = await sb.from('desas').delete().eq('id', id);
                if (dbErr) {
                    if (dbErr.code === '23503') {
                        throw new Error('Desa ini sudah memiliki data transaksi/stok. Hapus data terkait terlebih dahulu atau ubah statusnya menjadi nonaktif.');
                    }
                    throw dbErr;
                }
                
                Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Mitra Desa dan Akun Login berhasil dihapus.', timer: 2000, showConfirmButton: false });
                this.fetchDesas();
                if(typeof this.loadDesaFilter === 'function') this.loadDesaFilter();
            } catch (err) {
                Swal.fire('Gagal Hapus', err.message, 'error');
            }
        }
    }
};

$(document).on('submit', '#formTambahDesa', async function(e) {
    e.preventDefault();
    const generatedDesaId = crypto.randomUUID();
    const email = $('#new_email_desa').val(), 
    pass = $('#new_password_desa').val(), 
    nama = $('#new_nama_desa').val();
    
    try {
        const { data: authData, error: authErr } = await sbAdmin.auth.signUp({ 
            email: email, 
            password: pass, 
            options: { data: { role: 'admin_desa', desa_id: generatedDesaId, nama_desa: nama } } 
        });
        if (authErr) throw authErr;
        
        const newAuthUid = authData.user.id;
        const { error: dbErr } = await sb.from('desas').insert([{ 
            id: generatedDesaId, 
            nama_desa: nama, 
            admin_email: email,
            auth_uid: newAuthUid
        }]);
        if (dbErr) throw dbErr;

        Swal.fire('Berhasil!', `Desa ${nama} telah aktif.`, 'success');
        $('#modalTambahDesa').modal('hide');
        this.reset();
        MasterPage.fetchDesas();
    } catch (err) { Swal.fire('Gagal', err.message, 'error'); }
});