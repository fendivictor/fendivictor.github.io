// js/pages/stok.js

const StokPage = {
    searchKeyword: '',
    searchTimer: null,
    inventoryMap: {}, // Untuk menyimpan stok saat ini { variant_id: stok }

    init: function() {
        $('#tab-label').text('Manajemen Stok Gudang');
        $('#button-add-data').empty(); 
        $('#stat-area').hide();
        
        this.renderHeaderUI();
        this.fetchData();
    },

    renderHeaderUI: function() {
        const htmlFilter = `
            <div class="card border-0 shadow-sm mb-3" style="border-radius: 15px;">
                <div class="card-body p-2">
                    <div class="input-group px-1 pb-1">
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
                this.renderList(); // Cukup render ulang karena data sudah di-fetch semua
            }, 300);
        });
    },

    // Tarik data varian pusat dan stok lokal desa
    fetchData: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        try {
            // 1. Ambil semua katalog varian dari pusat
            const { data: variants, error: errVar } = await sb.from('product_variants')
                .select(`
                    id, harga_jual, 
                    units (name), 
                    products (id, name, categories(name))
                `);
            
            if (errVar) throw errVar;

            // 2. Ambil data stok khusus desa ini
            const { data: inventory, error: errInv } = await sb.from('inventory')
                .select('variant_id, stok_sekarang')
                .eq('desa_id', userDesaId);

            if (errInv) throw errInv;

            // 3. Petakan stok lokal ke dalam object agar mudah dicari
            this.inventoryMap = {};
            (inventory || []).forEach(inv => {
                this.inventoryMap[inv.variant_id] = inv.stok_sekarang;
            });

            // 4. Grouping varian berdasarkan produk induk (Biar tampilannya rapi per barang)
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
                    stock: this.inventoryMap[pv.id] || 0 // Jika belum ada di inventory, set 0
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
            // Filter pencarian berdasarkan nama produk
            if (this.searchKeyword && !p.name.toLowerCase().includes(this.searchKeyword)) return;

            let variantHtml = '';
            p.variants.forEach(v => {
                variantHtml += `
                    <div class="d-flex justify-content-between align-items-center bg-white p-2 mb-2 rounded border">
                        <div>
                            <span class="fw-bold" style="font-size: 0.85rem;">${v.unit_name}</span><br>
                            <small class="text-success fw-bold">Rp ${v.price.toLocaleString()}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <input type="number" id="input-stok-${v.variant_id}" class="form-control form-control-sm text-center fw-bold" style="width: 70px;" value="${v.stock}">
                            <button class="btn btn-sm btn-success" onclick="StokPage.updateStok('${v.variant_id}', '${p.name} - ${v.unit_name}')">
                                <i class="bi bi-check-lg"></i>
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

    // Fungsi untuk menyimpan perubahan stok ke database
    updateStok: async function(variantId, itemName) {
        const inputEl = $(`#input-stok-${variantId}`);
        const newStock = parseInt(inputEl.val());

        if (isNaN(newStock)) return Swal.fire('Error', 'Jumlah stok tidak valid', 'error');

        // Tampilkan loading di tombol
        const btn = inputEl.next('button');
        const originalHtml = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);

        try {
            // Cek apakah varian ini sudah ada di tabel inventory untuk desa ini
            const hasInventory = this.inventoryMap[variantId] !== undefined;

            if (hasInventory) {
                // Update
                const { error } = await sb.from('inventory')
                    .update({ stok_sekarang: newStock })
                    .match({ desa_id: userDesaId, variant_id: variantId });
                if (error) throw error;
            } else {
                // Insert baru
                const { error } = await sb.from('inventory')
                    .insert([{ 
                        desa_id: userDesaId, 
                        variant_id: variantId, 
                        stok_sekarang: newStock 
                    }]);
                if (error) throw error;
            }

            // Update state lokal agar tidak perlu fetch ulang seluruh data
            this.inventoryMap[variantId] = newStock;
            
            // Beri notifikasi sukses kecil (Toast) agar tidak mengganggu proses input cepat
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success',
                title: `${itemName} diupdate`,
                showConfirmButton: false, timer: 1500
            });

        } catch (error) {
            Swal.fire('Gagal Menyimpan', error.message, 'error');
            // Kembalikan angka ke stok awal jika gagal
            inputEl.val(this.inventoryMap[variantId] || 0);
        } finally {
            btn.html(originalHtml).prop('disabled', false);
        }
    }
};
