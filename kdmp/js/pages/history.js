// js/pages/history.js

const HistoryPage = {
    currentTab: 'Selesai', // Default tab
    currentPage: 0,
    pageSize: 10,
    searchKeyword: '',
    searchTimer: null,

    init: function() {
        $('#tab-label').text('Riwayat & Laporan');
        $('#button-add-data').empty(); // Kosongkan tombol tambah
        
        this.currentPage = 0;
        this.searchKeyword = '';
        
        this.renderHeaderUI();
        this.fetchStats();
        this.fetchData();
    },

    // 1. RENDER TABS & SEARCH BAR
    renderHeaderUI: function() {
        $('#stat-area').html('<div id="history-stats" class="row g-2 mb-3"></div>').show();

        const htmlFilter = `
            <div class="card border-0 shadow-sm mb-3" style="border-radius: 15px;">
                <div class="card-body p-2">
                    <ul class="nav nav-pills nav-justified mb-2" id="history-tabs">
                        <li class="nav-item"><button class="nav-link active fw-bold" style="border-radius: 10px;" onclick="HistoryPage.switchTab('Selesai', this)">✅ Selesai</button></li>
                        <li class="nav-item"><button class="nav-link fw-bold text-danger" style="border-radius: 10px;" onclick="HistoryPage.switchTab('Ditolak', this)">❌ Dibatalkan</button></li>
                    </ul>
                    <div class="d-flex gap-2 mt-2 px-1 pb-1">
                        <div class="input-group flex-grow-1">
                            <span class="input-group-text bg-light border-0" style="border-radius: 10px 0 0 10px;"><i class="bi bi-search"></i></span>
                            <input type="text" id="history-search" class="form-control bg-light border-0" style="border-radius: 0 10px 10px 0;" placeholder="Cari nama pemesan atau ID..." value="${this.searchKeyword}">
                        </div>
                        <button class="btn btn-success" style="border-radius: 10px;" onclick="HistoryPage.exportData('excel')" title="Export Excel"><i class="bi bi-file-earmark-excel"></i></button>
                        <button class="btn btn-danger" style="border-radius: 10px;" onclick="HistoryPage.exportData('pdf')" title="Export PDF"><i class="bi bi-file-earmark-pdf"></i></button>
                    </div>
                </div>
            </div>
        `;
        $('#filter-area').html(htmlFilter).show();

        $('#history-search').on('input', (e) => {
            this.searchKeyword = e.target.value;
            this.currentPage = 0; 
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.fetchData(), 500);
        });
    },

    switchTab: function(tabName, el) {
        this.currentTab = tabName;
        this.currentPage = 0;
        
        // Update UI Tab Aktif
        $('#history-tabs .nav-link').removeClass('active bg-success bg-danger text-white');
        if(tabName === 'Selesai') {
            $(el).addClass('active bg-success text-white').removeClass('text-danger');
        } else {
            $(el).addClass('active bg-danger text-white');
        }
        
        this.fetchData();
    },

    // 2. FETCH STATISTIK RINGKASAN & LABA RUGI (VERSI SNAPSHOT JSON)
    fetchStats: async function() {
        $('#history-stats').html('<div class="col-12 text-center small text-muted"><div class="spinner-border spinner-border-sm text-success"></div> Menghitung Laporan Keuangan...</div>');

        // 1. Ambil data Pesanan (Selesai dan Batal) - Tidak perlu lagi narik data Varian Pusat
        let querySelesai = sb.from('orders').select('total_price, items', { count: 'exact' }).eq('status', 'Selesai');
        let queryBatal = sb.from('orders').select('id', { count: 'exact' }).eq('status', 'Ditolak');

        // Filter Role 
        if (userRole !== 'super_admin') {
            querySelesai = querySelesai.eq('desa_id', userDesaId);
            queryBatal = queryBatal.eq('desa_id', userDesaId);
        }

        const [resSelesai, resBatal] = await Promise.all([querySelesai, queryBatal]);

        // 2. Kalkulasi Omset, Modal, dan Laba langsung dari JSON
        let totalOmset = 0;
        let totalModal = 0;

        if (resSelesai.data) {
            resSelesai.data.forEach(order => {
                totalOmset += (order.total_price || 0);

                let items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                items.forEach(item => {
                    // Ambil harga_beli langsung dari snapshot JSON (Default 0 jika pesanan lama belum punya field ini)
                    let modalPerItem = (item.harga_beli || 0) * item.qty;
                    totalModal += modalPerItem;
                });
            });
        }

        const labaBersih = totalOmset - totalModal;
        const countSelesai = resSelesai.count || 0;
        const countBatal = resBatal.count || 0;

        // 3. Render UI
        const statHtml = `
            <div class="col-md-4 col-6 mb-2">
                <div class="card border-0 bg-white shadow-sm h-100" style="border-radius: 15px; border-left: 5px solid #0dcaf0 !important;">
                    <div class="card-body p-3">
                        <small class="d-block text-muted fw-bold" style="font-size:0.7rem;">OMSET KOTOR</small>
                        <h5 class="fw-800 text-dark mb-0 mt-1">Rp ${totalOmset.toLocaleString()}</h5>
                        <small class="text-muted" style="font-size:0.7rem;">Dari ${countSelesai} pesanan</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-6 mb-2">
                <div class="card border-0 bg-white shadow-sm h-100" style="border-radius: 15px; border-left: 5px solid #ffc107 !important;">
                    <div class="card-body p-3">
                        <small class="d-block text-muted fw-bold" style="font-size:0.7rem;">TOTAL MODAL</small>
                        <h5 class="fw-800 text-dark mb-0 mt-1">Rp ${totalModal.toLocaleString()}</h5>
                        <small class="text-muted" style="font-size:0.7rem;">Harga Beli (HPP)</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-12 mb-2">
                <div class="card border-0 bg-success text-white shadow-sm h-100" style="border-radius: 15px;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <small class="d-block opacity-75 fw-bold" style="font-size:0.7rem;">LABA BERSIH</small>
                                <h4 class="fw-800 mb-0 mt-1">Rp ${labaBersih.toLocaleString()}</h4>
                            </div>
                            <div class="bg-white text-success rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                <i class="bi bi-graph-up-arrow fs-5"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $('#history-stats').html(statHtml);
    },

    // 3. FETCH DATA TABEL/LIST
    fetchData: async function() {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        const from = this.currentPage * this.pageSize;
        const to = from + this.pageSize - 1;

        // Query dengan JOIN ke tabel desas untuk menampilkan nama desa (khusus Super Admin)
        let query = sb.from('orders')
            .select('*, desas(nama_desa)', { count: 'exact' })
            .eq('status', this.currentTab);

        // Filter Role
        if (userRole !== 'super_admin') {
            query = query.eq('desa_id', userDesaId);
        }

        // Filter Pencarian (Cari berdasarkan nama customer atau ID pesanan)
        if (this.searchKeyword) {
            query = query.or(`customer_name.ilike.%${this.searchKeyword}%,id.ilike.%${this.searchKeyword}%`);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) return $('#main-content').html(`<p class="text-danger text-center py-5">${error.message}</p>`);

        this.renderList(data, count);
    },

    // 4. RENDER LIST & PAGINATION
    renderList: function(data, totalCount) {
        let html = '';

        (data || []).forEach(o => {
            let items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            let summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
            if (summary.length > 45) summary = summary.substring(0, 45) + '...';

            const badgeColor = this.currentTab === 'Selesai' ? 'bg-success' : 'bg-danger';
            const iconBatal = this.currentTab === 'Ditolak' ? `<small class="text-danger d-block mt-1"><i class="bi bi-info-circle"></i> Alasan: ${o.alasan_batal || 'Dibatalkan'}</small>` : '';
            
            // Label Desa (Hanya berguna untuk Super Admin agar tahu ini pesanan dari desa mana)
            const labelDesa = userRole === 'super_admin' ? `<span class="badge bg-light text-dark border mb-1"><i class="bi bi-shop"></i> ${o.desas?.nama_desa || 'Unknown'}</span><br>` : '';

            const tgl = new Date(o.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

            html += `
            <div class="card border-0 shadow-sm mb-2" style="border-radius:15px;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            ${labelDesa}
                            <span class="badge ${badgeColor} mb-1">${this.currentTab}</span>
                            <h6 class="fw-bold mb-0">${o.customer_name}</h6>
                            <small class="text-muted" style="font-size: 0.7rem;">${tgl}</small>
                        </div>
                        <div class="text-end">
                            <small class="text-muted" style="font-size: 0.7rem;">ID: ${o.id}</small><br>
                            <span class="fw-800 text-dark" style="font-size: 0.9rem;">Rp ${o.total_price.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="bg-light p-2 rounded-3 mt-2">
                        <p class="mb-0 text-muted" style="font-size: 0.75rem;"><i class="bi bi-box"></i> ${summary}</p>
                    </div>
                    ${iconBatal}
                </div>
            </div>`;
        });

        if (!data || data.length === 0) {
            html = `<div class="text-center py-5 opacity-50">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        Tidak ada riwayat ${this.currentTab.toLowerCase()}
                    </div>`;
        } else {
            html += this.renderPagination(totalCount);
        }

        $('#main-content').html(html);
    },

    renderPagination: function(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) return '';

        return `
            <div class="d-flex justify-content-between align-items-center mt-3 mb-4">
                <button class="btn btn-sm btn-outline-success" style="border-radius: 10px;"
                    ${this.currentPage === 0 ? 'disabled' : ''} 
                    onclick="HistoryPage.changePage(${this.currentPage - 1})">Sebelumnya</button>
                <span class="small fw-bold text-muted">Hal ${this.currentPage + 1} / ${totalPages}</span>
                <button class="btn btn-sm btn-outline-success" style="border-radius: 10px;"
                    ${this.currentPage + 1 >= totalPages ? 'disabled' : ''} 
                    onclick="HistoryPage.changePage(${this.currentPage + 1})">Selanjutnya</button>
            </div>
        `;
    },

    changePage: function(newPage) {
        this.currentPage = newPage;
        this.fetchData();
        window.scrollTo(0, 0);
    },

    exportData: async function(format) {
        Swal.showLoading();

        // 1. Tarik SEMUA data (tanpa limit/range) sesuai tab aktif & role
        let query = sb.from('orders').select('*, desas(nama_desa)').eq('status', this.currentTab).order('created_at', { ascending: false });
        if (userRole !== 'super_admin') query = query.eq('desa_id', userDesaId);
        if (this.searchKeyword) query = query.or(`customer_name.ilike.%${this.searchKeyword}%,id.ilike.%${this.searchKeyword}%`);

        const { data, error } = await query;
        if (error || !data || data.length === 0) return Swal.fire('Gagal', 'Tidak ada data untuk diekspor', 'error');

        // 2. Siapkan array data mentah untuk tabel
        const tableData = data.map((o, index) => {
            const tgl = new Date(o.created_at).toLocaleString('id-ID');
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            const detailBarang = items.map(i => `${i.qty}x ${i.name}`).join(', ');
            const namaDesa = o.desas?.nama_desa || 'Unknown';

            return [
                index + 1,
                tgl,
                o.id,
                namaDesa,
                o.customer_name,
                detailBarang,
                o.total_price,
                o.status
            ];
        });

        const headers = [['No', 'Tanggal', 'ID Pesanan', 'Desa', 'Pelanggan', 'Detail Barang', 'Total (Rp)', 'Status']];
        const fileName = `Laporan_Pesanan_${this.currentTab}_${new Date().getTime()}`;

        if (format === 'excel') {
            // EXPORT EXCEL
            const ws = XLSX.utils.aoa_to_sheet([...headers, ...tableData]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            Swal.close();
        } else if (format === 'pdf') {
            // EXPORT PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape'); // Kertas landscape agar muat banyak kolom
            
            doc.text(`Laporan Pesanan - ${this.currentTab}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

            doc.autoTable({
                startY: 25,
                head: headers,
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [25, 135, 84] }, // Warna Hijau Success
                styles: { fontSize: 8 }
            });

            doc.save(`${fileName}.pdf`);
            Swal.close();
        }
    }
};
