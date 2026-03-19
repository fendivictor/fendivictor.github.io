// js/pages/stok.js

const StokPage = {
    searchKeyword: '',
    searchTimer: null,
    inventoryMap: {},
    selectedDesaId: null, // Dinamis tergantung Role

    init: async function() {
        $('#tab-label').text('Manajemen Stok Gudang');
        $('#button-add-data').empty(); 
        $('#stat-area').hide();
        
        // Tentukan ID Desa awal
        this.selectedDesaId = userRole === 'super_admin' ? null : userDesaId;
        
        this.renderHeaderUI();

        // Jika Super Admin, load dropdown dulu. Jika Admin Desa, langsung load data.
        if (userRole === 'super_admin') {
            await this.loadDesaDropdown();
            // Tampilkan pesan kosong menyuruh pilih desa
            $('#main-content').html(`
                <div class="text-center py-5 opacity-50 mt-4">
                    <i class="bi bi-shop fs-1 d-block mb-3"></i>
                    <h6 class="fw-bold">Pilih Mitra Desa</h6>
                    <small>Silakan pilih desa di atas untuk memantau stok</small>
                </div>
            `);
        } else {
            this.fetchData();
        }
    },

    renderHeaderUI: function() {
        // Dropdown khusus Super Admin
        let adminFilter = userRole === 'super_admin' ? `
            <div class="mb-3 border-bottom pb-3">
                <label class="small fw-bold text-muted mb-1">Pantau Stok Desa:</label>
                <select id="stok-desa-filter" class="form-select bg-light border-0 fw-bold" onchange="StokPage.changeDesa(this.value)">
                    <option value="" disabled selected>Memuat daftar desa...</option>
                </select>
            </div>
        ` : '';

        const htmlFilter = `
            <div class="card border-0 shadow-sm mb-3" style="border-radius: 15px;">
                <div class="card-body p-3">
                    ${adminFilter}
                    <div class="input-group">
                        <span class="input-group-text bg-light border-0" style="border-radius: 10px 0 0 10px;"><i class="bi bi-search"></i></span>
                        <input type="text" id="stok-search" class="form-control bg-light border-0" style="border-radius: 0 10px 10px 0;" placeholder="Cari nama barang..." value="${this.searchKeyword}">
                    </div>
                </div>
            </div>
        `;
        $('#filter-area').html(htmlFilter).show();

        $('#stok-search').on('input', (e) => {
            this.searchKeyword = e.target.value.toLowerCase();
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                if(this.selectedDesaId) this.renderList();
            }, 300);
        });
    },

    loadDesaDropdown: async function() {
        const { data } = await sb.from('desas').select('id, nama_desa').order('nama_desa');
        let options = '<option value="" disabled selected>-- Pilih Desa yang Dipantau --</option>';
        if(data) {
            data.forEach(d => options += `<option value="${d.id}">${d.nama_desa}</option>`);
            $('#stok-desa-filter').html(options);
        }
    },

    changeDesa: function(desaId) {
        this.selectedDesaId = desaId;
        this.fetchData();
    },

    fetchData: async function() {
        if (!this.selectedDesaId) return;

        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        try {
            const { data: variants, error: errVar } = await sb.from('product_variants')
                .select(`id, harga_jual, units (name), products (id, name, categories(name))`);
            if (errVar) throw errVar;

            // Tarik data inventory berdasarkan selectedDesaId (Bisa milik Admin Desa atau pilihan Super Admin)
            const { data: inventory, error: errInv } = await sb.from('inventory')
                .select('variant_id, stok_sekarang')
                .eq('desa_id', this.selectedDesaId);
            if (errInv) throw errInv;

            this.inventoryMap = {};
            (inventory || []).forEach(inv => {
                this.inventoryMap[inv.variant_id] = inv.stok_sekarang;
            });

            let tempGroup = {};
            variants.forEach(pv => {
                if(!pv.products) return;
                const pId = pv.products.id;
                
                if (!tempGroup[pId]) {
                    tempGroup[pId] = {
                        id: pId,
                        name: pv.products.name,
                        category: pv.products.categories?.name || 'Umum',
                        variants: []
                    };
                }
                
                tempGroup[pId].variants.push({
                    variant_id: pv.id,
                    unit_name: pv.units?.name || 'Tanpa Satuan',
                    price: pv.harga_jual,
                    stock: this.inventoryMap[pv.id] || 0 
                });
            });

            this.groupedData = Object.values(tempGroup);
            this.renderList();

        } catch (error) {
            $('#main-content').html(`<p class="text-danger text-center py-5">${error.message}</p>`);
        }
    },

    renderList: function() {
        let html = '';

        this.groupedData.forEach(p => {
            if (this.searchKeyword && !p.name.toLowerCase().includes(this.searchKeyword)) return;

            let variantHtml = '';
            p.variants.forEach(v => {
                
                // LOGIKA ROLE: UI Input untuk Admin Desa, UI Label statis untuk Super Admin
                let inputArea = '';
                if (userRole === 'super_admin') {
                    const stockClass = v.stock > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                    inputArea = `<span class="badge ${stockClass} px-3 py-2" style="font-size: 0.85rem;">Stok: ${v.stock}</span>`;
                } else {
                    inputArea = `
                        <input type="number" id="input-stok-${v.variant_id}" class="form-control form-control-sm text-center fw-bold" style="width: 70px;" value="${v.stock}">
                        <button class="btn btn-sm btn-success" onclick="StokPage.updateStok('${v.variant_id}', '${p.name} - ${v.unit_name}')" title="Simpan Stok">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    `;
                }

                variantHtml += `
                    <div class="d-flex justify-content-between align-items-center bg-white p-2 mb-2 rounded border">
                        <div>
                            <span class="fw-bold" style="font-size: 0.85rem;">${v.unit_name}</span><br>
                            <small class="text-success fw-bold">Rp ${v.price.toLocaleString()}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${inputArea}
                            <button class="btn btn-sm btn-light border text-secondary" onclick="StokPage.lihatRiwayat('${v.variant_id}', '${p.name} - ${v.unit_name}')" title="Kartu Stok">
                                <i class="bi bi-clock-history"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
            <div class="card border-0 shadow-sm mb-3" style="border-radius:15px; background-color: #f8f9fa;">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-success-subtle rounded p-2 me-3 text-success">
                            <i class="bi bi-box-seam fs-5"></i>
                        </div>
                        <div>
                            <span class="badge bg-secondary mb-1" style="font-size:0.6rem;">${p.category}</span>
                            <h6 class="fw-bold mb-0">${p.name}</h6>
                        </div>
                    </div>
                    ${variantHtml}
                </div>
            </div>`;
        });

        if (!html) {
            html = `<div class="text-center py-5 opacity-50"><i class="bi bi-box fs-1 d-block mb-2"></i>Barang tidak ditemukan</div>`;
        }

        $('#main-content').html(html);
    },

    updateStok: async function(variantId, itemName) {
        if (userRole === 'super_admin') return Swal.fire('Ditolak', 'Super Admin hanya dapat melihat stok.', 'error');

        const inputEl = $(`#input-stok-${variantId}`);
        const newStock = parseInt(inputEl.val());

        if (isNaN(newStock)) return Swal.fire('Error', 'Jumlah stok tidak valid', 'error');

        const btn = inputEl.next('button');
        const originalHtml = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);

        try {
            const hasInventory = this.inventoryMap[variantId] !== undefined;
            const oldStock = hasInventory ? this.inventoryMap[variantId] : 0;
            const selisih = newStock - oldStock;

            // Jika tidak ada perubahan angka, batalkan proses (hemat kuota database)
            if (selisih === 0) {
                btn.html(originalHtml).prop('disabled', false);
                return;
            }

            // 1. Update/Insert ke tabel inventory utama
            if (hasInventory) {
                const { error } = await sb.from('inventory').update({ stok_sekarang: newStock }).match({ desa_id: this.selectedDesaId, variant_id: variantId });
                if (error) throw error;
            } else {
                const { error } = await sb.from('inventory').insert([{ desa_id: this.selectedDesaId, variant_id: variantId, stok_sekarang: newStock }]);
                if (error) throw error;
            }

            // 2. CATAT LOG KE RIWAYAT STOK
            await sb.from('riwayat_stok').insert([{
                desa_id: this.selectedDesaId,
                variant_id: variantId,
                jenis: 'Penyesuaian Manual',
                jumlah_perubahan: selisih,
                stok_akhir: newStock,
                keterangan: `Diubah oleh Admin Desa`
            }]);

            this.inventoryMap[variantId] = newStock;
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${itemName} diupdate`, showConfirmButton: false, timer: 1500 });
        } catch (error) {
            Swal.fire('Gagal Menyimpan', error.message, 'error');
            inputEl.val(this.inventoryMap[variantId] || 0);
        } finally {
            btn.html(originalHtml).prop('disabled', false);
        }
    },

    lihatRiwayat: async function(variantId, itemName) {
        if (!this.selectedDesaId) return Swal.fire('Oops', 'Pilih desa terlebih dahulu', 'warning');
        
        Swal.showLoading();
        
        $('#rs-nama-barang').text(itemName);
        $('#rs-tbody').html('<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-success"></div> Memuat...</td></tr>');
        $('#modalRiwayatStok').modal('show');

        // Tarik 50 histori terakhir untuk barang ini di desa ini
        const { data, error } = await sb.from('riwayat_stok')
            .select('*')
            .eq('desa_id', this.selectedDesaId)
            .eq('variant_id', variantId)
            .order('created_at', { ascending: false })
            .limit(50);

        Swal.close();

        if (error) {
            $('#rs-tbody').html(`<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`);
            return;
        }

        let html = '';
        if (!data || data.length === 0) {
            html = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada riwayat pergerakan stok.</td></tr>';
        } else {
            data.forEach(log => {
                const tgl = new Date(log.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
                
                // Format Warna Angka: Plus (Hijau), Minus (Merah)
                let badgeGerak = '';
                if (log.jumlah_perubahan > 0) badgeGerak = `<span class="badge bg-success-subtle text-success">+${log.jumlah_perubahan}</span>`;
                else if (log.jumlah_perubahan < 0) badgeGerak = `<span class="badge bg-danger-subtle text-danger">${log.jumlah_perubahan}</span>`;
                else badgeGerak = `<span class="badge bg-light text-dark">0</span>`;

                html += `
                    <tr>
                        <td class="text-muted" style="font-size: 0.75rem;">${tgl}</td>
                        <td class="fw-bold">${log.jenis}</td>
                        <td class="text-muted">${log.keterangan || '-'}</td>
                        <td class="text-center fs-6">${badgeGerak}</td>
                        <td class="text-center fw-bold fs-6">${log.stok_akhir}</td>
                    </tr>
                `;
            });
        }
        $('#rs-tbody').html(html);
    }
};
