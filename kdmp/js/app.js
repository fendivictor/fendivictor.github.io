// app.js
const config = {
    url: 'https://fsbtlscplnmdyomtesal.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYnRsc2NwbG5tZHlvbXRlc2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzAyMzUsImV4cCI6MjA4OTA0NjIzNX0.XJVWGucUvuKotVN2l2glzMHU400K6nhdIkmWm-oGo6w',
};

const sb = window.supabase.createClient(config.url, config.key);
const sbAdmin = window.supabase.createClient(config.url, config.key, { auth: { persistSession: false } });

let userRole, userDesaId, namaDesa;
let currentTab = 'pesanan';

async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return window.location.href = "login.html";

    const meta = session.user.user_metadata;
    userRole = meta.role || 'admin_desa';
    userDesaId = meta.desa_id || null;
    namaDesa = meta.nama_desa || session.user.email.split('@')[0];

    $('#admin-display-name').text(namaDesa);
    $('#admin-role-badge').text(userRole.toUpperCase().replace('_', ' '));
    $('#loader').fadeOut();

    if (userRole === 'super_admin') {
        $('#header-title').text('Admin Asosiasi');
        $('#nav-dynamic-sidebar').html(`
            <div class="px-3 mt-4 mb-2">
                <small class="text-light fw-bold" style="font-size: 0.65rem; letter-spacing: 1px;">MASTER DATA</small>
            </div>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white py-3" onclick="switchTab('produk', this)">
                    <i class="bi bi-box-seam"></i> Manajemen Produk
                </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white py-3" onclick="switchTab('desa', this)">
                <i class="bi bi-buildings"></i> Manajemen Desa
            </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white py-3" onclick="switchTab('master_kategori', this)">
                <i class="bi bi-tags"></i> Kategori Produk
            </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white py-3" onclick="switchTab('master_satuan', this)">
                <i class="bi bi-unity"></i> Satuan Barang
            </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white py-3" onclick="switchTab('anggota', this)">
                <i class="bi bi-people me-3 fs-5"></i> Data Anggota
            </a>
        `);
        loadDesaFilter();
    } else {
        $('#header-title').text(`Desa ${namaDesa}`);
        // $('#nav-dynamic-sidebar').remove();
    }
    
    switchTab('pesanan');
    subscribeOrders();
}

function switchTab(tab, el) {
    $('.list-group-item').removeClass('active');
    if(el) $(el).addClass('active');

    const sidebar = bootstrap.Offcanvas.getInstance(document.getElementById('sidebarMenu'));
    if(sidebar) sidebar.hide();
    
    currentTab = tab;
    $('#main-content').empty();
    $('#stat-area').hide();
    $('#filter-area').hide();
    $("#main-content").scrollTop(0);
    $("#main-content").css("scroll-behavior", "smooth");
    $("#button-add-data").empty();

    switch(tab) {
        case 'pesanan':        PesananPage.init('active'); break;
        case 'history':        HistoryPage.init(); break;
        case 'produk':         ProdukPage.init(); break;
        case 'master_kategori': MasterPage.init('categories'); break;
        case 'master_satuan':   MasterPage.init('units'); break;
        case 'desa':           MasterPage.initDesa(); break;
        case 'anggota': AnggotaPage.init(); break;
        case 'stok': StokPage.init(); break;
    }
}

function subscribeOrders() {
    sb.channel('orders-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        (payload) => {
            if (payload.eventType === 'INSERT' && userRole === 'admin_desa' && payload.new.desa_id === userDesaId) {
                Swal.fire('Pesanan Baru!', `Dari ${payload.new.customer_name}`, 'info');
            }
            if (currentTab === 'pesanan' || currentTab === 'history') PesananPage.fetchOrders(currentTab === 'history' ? 'history' : 'active');
        }
    ).subscribe();
}

async function loadDesaFilter() {
    const { data } = await sb.from('desas').select('id, nama_desa');
    let options = '<option value="all">Semua Desa</option>';
    data.forEach(d => options += `<option value="${d.id}">${d.nama_desa}</option>`);
    $('#filter-area').html(`<select class="form-select filter-select" onchange="filterByDesa(this.value)">${options}</select>`);
}

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', target);
    $('#dark-icon').attr('class', target === 'dark' ? 'bi bi-sun-fill fs-4' : 'bi bi-moon-stars fs-4');
    localStorage.setItem('theme', target);
}

async function handleLogout() {
    Swal.fire({ title: 'Keluar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#198754' }).then(async (r) => {
        if(r.isConfirmed) { await sb.auth.signOut(); window.location.href="login.html"; }
    });
}

$(document).ready(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    if(savedTheme === 'dark') $('#dark-icon').attr('class', 'bi bi-sun-fill fs-4');
    init();
});
