let currentOrderData = null;
const PesananPage = {
    init: function(mode) {
        $('#tab-label').text(mode === 'history' ? 'Riwayat Selesai' : 'Pesanan Masuk');
        $('#stat-area').show();
        $('#button-add-data').empty();
        this.fetchPesanan(mode);
    },

    fetchOrders: async function(mode) {
        let q = sb.from('orders').select('*');
        if (userRole !== 'super_admin') q = q.eq('desa_id', userDesaId);

        if (mode === 'history') q = q.in('status', ['Selesai', 'Dibatalkan']);
        else q = q.not('status', 'in', '("Selesai","Dibatalkan")');

        const { data: orders } = await q.order('created_at', { ascending: false });
        this.render(orders, mode);
    },

    render: function(orders, mode) {
        let html = '';
        let total = 0;
        let count = 0;

        (orders || []).forEach(o => {
            if (o.status !== 'Dibatalkan') total += o.total_price;
            if (currentTab === 'pesanan' && (o.status === 'pending' || o.status === 'Pesanan Masuk')) count++;
            if (currentTab === 'history' && o.status === 'Selesai') count++;
            const isHistory = ['Selesai', 'Dibatalkan'].includes(o.status);

            let coordButton = '';
            if(o.coords && o.coords !== 'Ambil Sendiri') {
                // Perbaikan link Google Maps
                coordButton = `<a href="https://www.google.com/maps?q=${o.coords}" target="_blank" class="btn btn-outline-danger btn-sm px-3 me-1"><i class="bi bi-geo-alt-fill"></i></a>`;
            }

            let btnLabel = '';
            let btnClass = '';

            if (o.status === 'pending' || o.status === 'Pesanan Masuk') { 
                btnLabel = 'KONFIRMASI'; btnClass = 'btn-warning'; 
            } else if (o.status === 'Dikonfirmasi') { 
                btnLabel = 'MULAI PROSES'; btnClass = 'btn-info text-white'; 
            } else if (o.status === 'Diproses') { 
                btnLabel = 'SIAP / KIRIM'; btnClass = 'btn-primary'; 
            } else if (o.status === 'Diantar' || o.status === 'Siap Diambil') { 
                btnLabel = 'SELESAIKAN'; btnClass = 'btn-success'; 
            }

            html += `<div class="card order-card p-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="status-badge border bg-light ${PesananPage.getStatusClass(o.status)}">${o.status}</span>
                        <h6 class="fw-800 mb-0 mt-2">${o.customer_name}</h6>
                        <small class="opacity-50" style="font-size:0.6rem;">Desa: ${o.desa_id}</small>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold text-success">Rp ${o.total_price.toLocaleString()}</span>
                        <div class="mt-1">
                            ${coordButton}
                            <button class="btn btn-outline-success btn-sm px-3" onclick="window.open('https://wa.me/62${o.whatsapp}')"><i class="bi bi-whatsapp"></i></button>
                        </div>
                    </div>
                </div>
                <div class="mt-3 d-flex gap-2">
                    ${!isHistory ? `
                        <button class="btn ${btnClass} btn-sm flex-grow-1 fw-bold py-2 shadow-sm" 
                                onclick="PesananPage.changeStatus('${o.id}', '${o.status}')" style="border-radius: 12px;">
                            <i class="bi bi-arrow-right-circle-fill me-1"></i> ${btnLabel}
                        </button>
                        <button class="btn btn-outline-danger btn-sm px-3" onclick="PesananPage.cancelOrder('${o.id}')" style="border-radius: 12px;">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : `
                        <button class="btn btn-light btn-sm w-100 py-2 border text-muted fw-bold" disabled style="border-radius: 12px;">
                            <i class="bi bi-check-circle-fill text-success"></i> TERARSIP
                        </button>
                    `}
                </div>
            </div>`;
        });

        let omzet = 'Rp ' + (total/1000).toFixed(0) + 'K';
        $("#stat-area").html(`<div id="stat-area" class="card stat-card mb-4 mt-5">
            <div class="card-body py-4 text-center">
                <div class="row">
                    <div class="col-6 border-end">
                        <small class="text-muted d-block fw-600" id="stat-label">Pesanan Baru</small>
                        <span id="stat-new" class="fw-800 fs-3 text-warning">${count}</span>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block fw-600">Omzet Total</small>
                        <span id="stat-omzet" class="fw-800 fs-3 text-success">${omzet}</span>
                    </div>
                </div>
            </div>
        </div>`);

        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Tidak ada pesanan</p>');
        //$('#stat-new').text(count);
        //$('#stat-omzet').text('Rp ' + (total/1000).toFixed(0) + 'K');
    },

    getStatusClass: function(status) {
        switch(status) {
            case 'Pesanan Masuk': return 'bg-warning-subtle text-warning border-warning'; // Kuning
            case 'Dikonfirmasi':  return 'bg-info-subtle text-info border-info';       // Biru Muda
            case 'Diproses':      return 'bg-primary-subtle text-primary border-primary'; // Biru
            case 'Siap Diambil':  return 'bg-secondary-subtle text-secondary border-secondary'; // Abu
            case 'Diantar':       return 'bg-info text-dark';                         // Biru Solid
            case 'Selesai':       return 'bg-success-subtle text-success border-success'; // Hijau
            case 'Dibatalkan':    return 'bg-danger-subtle text-danger border-danger';    // Merah
            default: return 'bg-light text-muted';
        }
    },

    cancelOrder: async function(orderId) {
        const { isConfirmed } = await Swal.fire({
            title: 'Batalkan Pesanan?',
            text: "Tindakan ini tidak dapat dibatalkan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Kembali'
        });

        if (isConfirmed) {
            const { error } = await sb.from('orders')
                .update({ status: 'Dibatalkan' })
                .eq('id', orderId);

            if (!error) {
                fetchOrders();
            }
        }
    },

    changeStatus: async function(orderId, currentStatus) {
        let nextStatus = '';
        let confirmText = '';
        
        // Alur Status Step-by-Step
        if (currentStatus === 'pending' || currentStatus === 'Pesanan Masuk') {
            nextStatus = 'Dikonfirmasi';
            confirmText = 'Konfirmasi pesanan ini?';
        } 
        else if (currentStatus === 'Dikonfirmasi') {
            nextStatus = 'Diproses';
            confirmText = 'Mulai proses/kemas barang?';
        } 
        else if (currentStatus === 'Diproses') {
            // KHUSUS: Pilihan antara Diantar atau Siap Diambil
            const { value: pilihan } = await Swal.fire({
                title: 'Pesanan Selesai Diproses',
                text: 'Pilih metode distribusi selanjutnya:',
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '🛵 Diantar',
                denyButtonText: '🏠 Siap Diambil',
                confirmButtonColor: '#0dcaf0',
                denyButtonColor: '#6c757d'
            });

            if (pilihan) nextStatus = 'Diantar';
            else if (pilihan === false) nextStatus = 'Siap Diambil'; // Deny button
            else return; // Cancel
        } 
        else if (currentStatus === 'Diantar' || currentStatus === 'Siap Diambil') {
            nextStatus = 'Selesai';
            confirmText = 'Tandai pesanan telah diterima & SELESAI?';
        }

        if (nextStatus) {
            const { isConfirmed } = await Swal.fire({
                title: 'Update Status',
                text: confirmText || `Ubah status ke ${nextStatus}?`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#198754'
            });

            if (isConfirmed) {
                const { error } = await sb.from('orders').update({ status: nextStatus }).eq('id', orderId);
                if (!error) {
                    Swal.fire({ icon: 'success', title: nextStatus, timer: 1000, showConfirmButton: false });
                    fetchOrders();
                }
            }
        }
    },

    fetchPesanan: async function(mode) {
        $('#main-content').html('<div class="text-center py-5"><div class="spinner-border text-success"></div></div>');

        let q = sb.from('orders').select('*');
        if (userRole !== 'super_admin') q = q.eq('desa_id', userDesaId);

        if (mode === 'history') q = q.in('status', ['Selesai', 'Dibatalkan']);
        else q = q.not('status', 'in', '("Selesai","Dibatalkan")');

        // Tarik pesanan khusus desa ini
        const { data: orders, error } = await q
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return $('#main-content').html(`<p class="text-danger text-center py-5">${error.message}</p>`);

        let html = '';
        let total = 0;
        let count = 0;
        (orders || []).forEach(o => {
            let badgeColor = o.status === 'Pesanan Masuk' ? 'bg-warning text-dark' : 
                             o.status === 'Diproses' ? 'bg-primary' : 
                             o.status === 'Selesai' ? 'bg-success' : 'bg-danger';

            if (o.status !== 'Dibatalkan') total += o.total_price;
            if (currentTab === 'pesanan' && (o.status === 'pending' || o.status === 'Pesanan Masuk')) count++;
            if (currentTab === 'history' && o.status === 'Selesai') count++;

            // Parsing item JSON untuk menampilkan ringkasan
            let items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            let summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
            if (summary.length > 50) summary = summary.substring(0, 50) + '...';

            html += `
            <div class="card border-0 shadow-sm mb-2" style="border-radius:15px; cursor:pointer;" onclick="PesananPage.openDetail('${o.id}')">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <span class="badge ${badgeColor} mb-1">${o.status}</span>
                            <h6 class="fw-bold mb-0">${o.customer_name}</h6>
                        </div>
                        <div class="text-end">
                            <small class="text-muted" style="font-size: 0.7rem;">ID: ${o.id}</small><br>
                            <span class="fw-800 text-success" style="font-size: 0.9rem;">Rp ${o.total_price.toLocaleString()}</span>
                        </div>
                    </div>
                    <p class="mb-0 text-muted small"><i class="bi bi-box"></i> ${summary}</p>
                    <small class="text-muted" style="font-size: 0.7rem;">
                        <i class="bi bi-geo-alt"></i> ${o.coords === 'Ambil Sendiri' ? 'Diambil sendiri' : 'Minta Diantar'}
                    </small>
                </div>
            </div>`;
        });

        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Belum ada pesanan masuk</p>');
        //$('#stat-new').text(count);
        //$('#stat-omzet').text('Rp ' + (total/1000).toFixed(0) + 'K');
        let omzet = 'Rp ' + (total/1000).toFixed(0) + 'K';
        $("#stat-area").html(`<div id="stat-area" class="card stat-card mb-4 mt-5">
            <div class="card-body py-4 text-center">
                <div class="row">
                    <div class="col-6 border-end">
                        <small class="text-muted d-block fw-600" id="stat-label">Pesanan Baru</small>
                        <span id="stat-new" class="fw-800 fs-3 text-warning">${count}</span>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block fw-600">Omzet Total</small>
                        <span id="stat-omzet" class="fw-800 fs-3 text-success">${omzet}</span>
                    </div>
                </div>
            </div>
        </div>`);
        
    },

    openDetail: async function(orderId) {
        Swal.showLoading();
        
        // 1. Ambil Data Pesanan
        const { data: order } = await sb.from('orders').select('*').eq('id', orderId).single();
        if(!order) return Swal.fire('Error', 'Pesanan tidak ditemukan', 'error');
        currentOrderData = order;

        let items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        
        // 2. Kumpulkan semua variant_id dari pesanan ini
        let variantIds = items.map(i => i.variant_id);

        // 3. Cek Stok di Inventory Desa ini
        const { data: inventory } = await sb.from('inventory')
            .select('variant_id, stok_sekarang')
            .eq('desa_id', userDesaId)
            .in('variant_id', variantIds);

        // Buat map stok untuk pencarian cepat
        let stockMap = {};
        (inventory || []).forEach(inv => stockMap[inv.variant_id] = inv.stok_sekarang);

        // 4. Render UI Modal
        $('#det-id').text(order.id);
        $('#det-nama').text(order.customer_name);
        $('#det-wa').attr('href', `https://wa.me/62${order.whatsapp.replace(/^0+/, '')}`);
        $('#det-metode').html(order.coords === 'Ambil Sendiri' ? '<span class="badge bg-info text-dark">Ambil Sendiri</span>' : '<span class="badge bg-primary">Diantar Kurir</span>');
        $('#det-alamat').text(order.address || '-');
        $('#det-total').text(`Rp ${order.total_price.toLocaleString()}`);

        let itemsHtml = '';
        let isStokAman = true;

        items.forEach(item => {
            let currentStock = stockMap[item.variant_id] || 0; // Jika tidak ada di inventory, stok = 0
            let kekurangan = currentStock - item.qty;
            
            let statusStok = '';
            if (kekurangan >= 0) {
                statusStok = `<span class="badge bg-success-subtle text-success"><i class="bi bi-check-circle"></i> Aman</span>`;
            } else {
                statusStok = `<span class="badge bg-danger-subtle text-danger"><i class="bi bi-exclamation-triangle"></i> Kurang ${Math.abs(kekurangan)}</span>`;
                isStokAman = false; // Ada minimal 1 barang yang stoknya kurang
            }

            itemsHtml += `
                <tr>
                    <td class="fw-bold" style="font-size:0.85rem;">${item.name}</td>
                    <td class="text-center">${item.qty}</td>
                    <td class="text-center">${currentStock}</td>
                    <td class="text-center">${statusStok}</td>
                </tr>
            `;
        });
        $('#det-items').html(itemsHtml);

        // 5. Atur Tombol Aksi Berdasarkan Status
        let actionHtml = '';
        if (order.status === 'Pesanan Masuk') {
            if (isStokAman) {
                actionHtml = `<button class="btn btn-success fw-bold px-4" style="border-radius:12px;" onclick="PesananPage.prosesPesanan()"><i class="bi bi-check2-circle"></i> Konfirmasi & Potong Stok</button>`;
            } else {
                actionHtml = `
                    <small class="text-danger d-block mb-1 fw-bold" style="font-size:0.7rem;">Stok tidak mencukupi!</small>
                    <button class="btn btn-outline-danger fw-bold" style="border-radius:12px;" onclick="PesananPage.tolakPesanan()"><i class="bi bi-x-circle"></i> Tolak Pesanan</button>
                    <button class="btn btn-warning fw-bold px-3 ms-1" style="border-radius:12px;" onclick="PesananPage.prosesPesanan(true)"><i class="bi bi-exclamation-circle"></i> Paksa Proses</button>
                `;
            }
        } else if (order.status === 'Diproses') {
            actionHtml = `<button class="btn btn-primary fw-bold px-4" style="border-radius:12px;" onclick="PesananPage.selesaikanPesanan()"><i class="bi bi-flag"></i> Tandai Selesai</button>`;
        }
        
        $('#action-buttons').html(actionHtml);

        Swal.close();
        $('#modalDetailPesanan').modal('show');
    },

    // --- FUNGSI AKSI PESANAN ---

    prosesPesanan: async function(isForce = false) {
        const textConfirm = isForce ? "Memaksa proses akan membuat stok gudang menjadi minus. Lanjutkan?" : "Pesanan akan diproses dan stok akan otomatis dipotong.";
        
        const { isConfirmed } = await Swal.fire({
            title: 'Proses Pesanan?', text: textConfirm, icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Proses'
        });

        if (!isConfirmed) return;
        
        Swal.showLoading();
        let items = typeof currentOrderData.items === 'string' ? JSON.parse(currentOrderData.items) : currentOrderData.items;

        try {
            // 1. Potong Stok per item di tabel inventory
            for (let item of items) {
                // Ambil stok saat ini
                const { data: invData } = await sb.from('inventory')
                    .select('stok_sekarang')
                    .match({ desa_id: userDesaId, variant_id: item.variant_id })
                    .single();
                
                let sisaStok = (invData ? invData.stok_sekarang : 0) - item.qty;

                // Update stok (atau Insert jika sebelumnya barang belum ada di inventory sama sekali)
                if (invData) {
                    await sb.from('inventory').update({ stok_sekarang: sisaStok }).match({ desa_id: userDesaId, variant_id: item.variant_id });
                } else {
                    await sb.from('inventory').insert([{ desa_id: userDesaId, variant_id: item.variant_id, stok_sekarang: sisaStok }]);
                }
            }

            // 2. Update Status Pesanan
            const { error: errOrder } = await sb.from('orders').update({ status: 'Diproses' }).eq('id', currentOrderData.id);
            if(errOrder) throw errOrder;

            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pesanan diproses & stok dipotong.', timer: 1500, showConfirmButton: false });
            $('#modalDetailPesanan').modal('hide');
            this.fetchPesanan();
        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    },

    selesaikanPesanan: async function() {
        Swal.showLoading();
        await sb.from('orders').update({ status: 'Selesai' }).eq('id', currentOrderData.id);
        Swal.fire({ icon: 'success', title: 'Pesanan Selesai', timer: 1000, showConfirmButton: false });
        $('#modalDetailPesanan').modal('hide');
        this.fetchPesanan();
    },

    tolakPesanan: async function() {
        const { value: alasan } = await Swal.fire({
            title: 'Tolak Pesanan', input: 'text', inputLabel: 'Alasan penolakan', showCancelButton: true
        });
        
        if (alasan) {
            Swal.showLoading();
            await sb.from('orders').update({ status: 'Ditolak', alasan_batal: alasan }).eq('id', currentOrderData.id);
            Swal.fire('Ditolak', 'Pesanan telah dibatalkan', 'success');
            $('#modalDetailPesanan').modal('hide');
            this.fetchPesanan();
        }
    }

};
