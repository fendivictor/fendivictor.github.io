// pages/produk.js
var unitOptionsHTML = '';

const ProdukPage = {
    init: async function() {
        $('#tab-label').text('Manajemen Produk');
        this.fetchProducts();
        const btnAdd = `<button class="btn btn-success w-100 mb-3 py-2 fw-bold" onclick="ProdukPage.openAddProduct()" style="border-radius:15px;">
                            <i class="bi bi-plus-circle me-2"></i> Tambah Produk Baru
                        </button>`;
        $('#button-add-data').html(btnAdd); // Munculkan tombol sebelum list
        // Load Kategori & Satuan
        const { data: cats } = await sb.from('categories').select('*').order('name');
        const { data: units } = await sb.from('units').select('*').order('name');

        // Buat options untuk select
        $('#p-category').html(cats.map(c => `<option value="${c.id}">${c.name}</option>`).join(''));
        unitOptionsHTML = units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    },

    fetchProducts: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        // Join: Products -> Categories -> Variants -> Units
        let q = sb.from('products').select(`
            *,
            categories(name),
            product_variants(
                id,
                harga_jual,
                harga_beli,
                stok,
                units(name)
            )
        `);

        const { data: products } = await q.order('name');

        let html = '';
        (products || []).forEach(p => {
            // Render List Varian Harga
            let variantHtml = '';
            p.product_variants.forEach(v => {
                variantHtml += `
                    <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded-3 mb-1" style="font-size: 0.75rem;">
                        <span class="fw-bold">${v.units.name}</span>
                        <div class="text-end">
                            <span class="text-dark small">Beli: Rp ${v.harga_beli.toLocaleString()}</span><br>
                            <span class="text-success fw-bold">Jual: Rp ${v.harga_jual.toLocaleString()}</span>
                        </div>
                    </div>
                `;
            });

            html += `
            <div class="card order-card p-3 mb-3 border-0 shadow-sm" style="border-radius:20px;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="badge bg-success-subtle text-success mb-1" style="font-size:0.6rem;">${p.categories?.name || 'Umum'}</span>
                        <h6 class="fw-800 mb-0">${p.name}</h6>
                    </div>
                    <button class="btn btn-sm btn-light border-0" onclick="ProdukPage.manageVariants('${p.id}')">
                        <i class="bi bi-plus-circle text-primary"></i> Varian
                    </button>
                </div>
                <div class="variants-area mt-2">
                    ${variantHtml || '<small class="text-muted">Belum ada harga</small>'}
                </div>
            </div>`;
        });

        $('#main-content').html(html || '<p class="text-center py-5">Produk kosong</p>');
    },

    openAddProduct: async function() {
        $('#productModalLabel').text('Tambah Produk Baru');
        $('#p-name').val('');
        $('#variant-container').empty();
        
        // Tambah satu baris default
        this.addRowVariant();
        
        $('#productModal').modal('show');
    },

    addRowVariant: function() {
        const id = Date.now();
        const html = `
            <div class="variant-row card border-0 bg-light p-3 mb-2" id="v-${id}" style="border-radius: 15px;">
                <div class="row g-2">
                    <div class="col-7">
                        <label class="small text-muted" style="font-size:0.65rem;">SATUAN</label>
                        <select class="form-select form-select-sm border-0 v-unit">${unitOptionsHTML}</select>
                    </div>
                    <div class="col-5 text-end">
                        <button class="btn btn-link text-danger btn-sm p-0 mt-3" onclick="$('#v-${id}').remove()">Hapus</button>
                    </div>
                    <div class="col-6">
                        <label class="small text-muted" style="font-size:0.65rem;">HARGA BELI</label>
                        <input type="number" class="form-control form-control-sm border-0 v-beli" placeholder="0">
                    </div>
                    <div class="col-6">
                        <label class="small text-muted" style="font-size:0.65rem;">HARGA JUAL</label>
                        <input type="number" class="form-control form-control-sm border-0 v-jual" placeholder="0">
                    </div>
                </div>
            </div>
        `;
        $('#variant-container').append(html);
    },

    saveProduct: async function() {
        const name = $('#p-name').val();
        const catId = $('#p-category').val();
        
        if(!name || !catId) return alert("Nama dan Kategori harus diisi");

        // 1. Simpan ke tabel Products
        const { data: product, error: pError } = await sb.from('products').insert([
            { name: name, category_id: catId }
        ]).select().single();

        if(pError) return console.error(pError);

        // 2. Ambil data dari semua baris varian
        const variants = [];
        $('.variant-row').each(function() {
            variants.push({
                product_id: product.id,
                unit_id: $(this).find('.v-unit').val(),
                harga_beli: $(this).find('.v-beli').val() || 0,
                harga_jual: $(this).find('.v-jual').val() || 0
            });
        });

        // 3. Simpan massal ke tabel Product_variants
        if(variants.length > 0) {
            await sb.from('product_variants').insert(variants);
        }

        $('#productModal').modal('hide');
        Swal.fire('Berhasil', 'Produk dan varian harga telah disimpan', 'success');
        this.fetchProducts();
    },

    fetchInventoryDesa: async function() {
        $('#main-content').html('<div class="spinner-border text-success"></div>');

        // Kita ambil data dari tabel inventory yang di-join ke produk global
        const { data: stocks, error } = await sb.from('inventory').select(`
            id,
            stok_sekarang,
            product_variants (
                id,
                harga_jual,
                units (name),
                products (nama_barang, categories(name))
            )
        `).eq('desa_id', userDesaId);

        let html = '';
        (stocks || []).forEach(s => {
            const p = s.product_variants.products;
            const v = s.product_variants;

            html += `
            <div class="card order-card p-3 mb-2 border-0 shadow-sm" style="border-radius:15px;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-success fw-bold">${p.categories.name}</small>
                        <h6 class="fw-800 mb-0">${p.nama_barang}</h6>
                        <small class="text-muted">${v.units.name} | Harga: Rp ${v.harga_jual.toLocaleString()}</small>
                    </div>
                    <div class="text-end">
                        <small class="d-block text-muted" style="font-size:0.6rem;">STOK SAAT INI</small>
                        <span class="fw-800 fs-5 ${s.stok_sekarang < 5 ? 'text-danger' : 'text-dark'}">${s.stok_sekarang}</span>
                        <button class="btn btn-sm btn-light ms-2" onclick="updateStockPrompt('${s.id}', ${s.stok_sekarang})">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });

        $('#main-content').html(html || `
            <div class="text-center py-5">
                <p class="opacity-50">Belum ada stok barang di desa kamu.</p>
                <button class="btn btn-success btn-sm" onclick="openKatalogGlobal()">Ambil dari Katalog Pusat</button>
            </div>
        `);
    },

    openKatalogGlobal: async function() {
        // Ambil semua produk yang sudah dibuat Super Admin
        const { data: variants } = await sb.from('product_variants').select(`
            id,
            harga_jual,
            units(name),
            products(nama_barang)
        `);

        // Tampilkan di modal agar Admin Desa bisa pilih
        // Setelah pilih, insert ke tabel 'inventory' dengan desa_id milik admin tersebut
    },

    updateStockPrompt: async function(inventoryId, currentStock) {
        const { value: newStock } = await Swal.fire({
            title: 'Update Stok',
            input: 'number',
            inputValue: currentStock,
            showCancelButton: true,
            confirmButtonText: 'Simpan Stok'
        });

        if (newStock !== undefined) {
            await sb.from('inventory').update({ stok_sekarang: newStock }).eq('id', inventoryId);
            this.fetchInventoryDesa();
        }
    },

    manageVariants: async function(productId) {
        // 1. Ambil data varian yang sudah ada di Pusat
        const { data: variants, error } = await sb.from('product_variants')
            .select(`id, harga_jual, units (name)`)
            .eq('product_id', productId);

        if (userRole === 'super_admin') {
            // Jika Super Admin, arahkan untuk tambah varian dulu
            return this.promptAddVariantPusat(productId);
        }
        // 2. JIKA KOSONG (Ini perbaikannya)
        if (!variants || variants.length === 0) {
            return Swal.fire('Varian Belum Tersedia', 'Produk ini belum memiliki satuan resmi dari Pusat. Silakan hubungi Super Admin.', 'info');
        }

        // 3. JIKA ADA, tampilkan pilihan untuk dimasukkan ke Inventory Desa
        this.showVariantSelector(variants);
    },

    showVariantSelector: async function(variants) {
        let optionsHtml = '<div class="text-start">';
        
        variants.forEach(v => {
            optionsHtml += `
                <div class="card mb-2 border-0 bg-light p-3" style="border-radius:15px; cursor:pointer;" 
                     onclick="ProdukPage.saveToInventory('${v.id}', '${v.units.name}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="fw-bold d-block">${v.units.name}</span>
                            <small class="text-success">Harga Jual: Rp ${v.harga_jual.toLocaleString()}</small>
                        </div>
                        <i class="bi bi-plus-circle-fill text-primary fs-4"></i>
                    </div>
                </div>`;
        });
        optionsHtml += '</div>';

        Swal.fire({
            title: 'Pilih Satuan/Varian',
            html: optionsHtml,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Tutup'
        });
    },

    saveToInventory: async function(variantId, unitName) {
        // 1. Cek apakah varian ini sudah ada di stok desa Victor
        const { data: existing } = await sb.from('inventory')
            .select('id')
            .eq('variant_id', variantId);
            
        // Cek dengan .length saja
        if (existing && existing.length > 0) {
            return Swal.fire('Sudah Ada', 'Varian ini sudah ada di stok desa.', 'info');
        }

        // 2. Jika belum ada, tambahkan dengan stok awal 0
        const { error } = await sb.from('inventory').insert([{
            variant_id: variantId,
        }]);

        if (!error) {
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `${unitName} ditambahkan ke inventory desa.`,
                timer: 1500
            });
            this.fetchStokDesa(); // Refresh list stok desa
        } else {
            Swal.fire('Gagal', 'Terjadi kesalahan saat menambah stok.', 'error');
        }
    },
    
    promptAddVariantPusat: async function(productId) {
        // Ambil list satuan (units) untuk dropdown
        const { data: units } = await sb.from('units').select('*').order('name');
        
        let unitOptions = units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: 'Tambah Varian Baru (Pusat)',
            html: `
                <div class="text-start">
                    <label class="small text-muted">Satuan</label>
                    <select id="swal-unit" class="form-select mb-2">${unitOptions}</select>
                    <label class="small text-muted">Harga Modal (Beli)</label>
                    <input id="swal-beli" type="number" class="form-control mb-2" placeholder="0">
                    <label class="small text-muted">Harga Jual Standar</label>
                    <input id="swal-jual" type="number" class="form-control" placeholder="0">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Simpan Varian',
            preConfirm: () => {
                const u = document.getElementById('swal-unit').value;
                const b = document.getElementById('swal-beli').value;
                const j = document.getElementById('swal-jual').value;
                if (!u || !b || !j) return Swal.showValidationMessage('Semua field harus diisi');
                return { unit_id: u, harga_beli: b, harga_jual: j };
            }
        });

        if (formValues) {
            const { error } = await sb.from('product_variants').insert([{
                product_id: productId,
                unit_id: formValues.unit_id,
                harga_beli: parseInt(formValues.harga_beli),
                harga_jual: parseInt(formValues.harga_jual)
            }]);

            if (!error) {
                Swal.fire('Berhasil', 'Varian katalog berhasil ditambahkan', 'success');
                this.fetchProducts(); // Refresh data
            } else {
                Swal.fire('Error', error.message, 'error');
            }
        }
    }
};