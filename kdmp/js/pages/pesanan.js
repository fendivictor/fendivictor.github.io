const PesananPage = {
    init: function(mode) {
        $('#tab-label').text(mode === 'history' ? 'Riwayat Selesai' : 'Pesanan Masuk');
        $('#stat-area').show();
        this.fetchOrders(mode);
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

        $('#main-content').html(html || '<p class="text-center py-5 opacity-50">Tidak ada pesanan</p>');
        $('#stat-new').text(count);
        $('#stat-omzet').text('Rp ' + (total/1000).toFixed(0) + 'K');
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
    }

};