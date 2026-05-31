<!DOCTYPE html>
<html lang="fr" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fidelis Plus | Documentation API</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; }
        .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); }
        pre { font-family: 'Consolas', 'Monaco', monospace; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
    </style>
</head>
<body class="bg-gray-50 text-slate-800">

<!-- Navigation -->
<nav class="sticky top-0 z-50 glass border-b border-emerald-100 px-6 py-4 flex justify-between items-center shadow-sm">
    <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xl">
            <i class="fas fa-shield-alt"></i>
        </div>
        <div>
            <span class="text-xl font-bold text-emerald-950 uppercase tracking-wider leading-none">FIDELIS+</span>
            <p class="text-[10px] text-emerald-600 font-semibold tracking-[0.2em] uppercase">Developer HUB</p>
        </div>
    </div>
    <div class="flex items-center gap-4 text-sm font-medium text-emerald-700">
        <span class="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">v1.2.0</span>
        <a href="#try-it-out" class="bg-emerald-600 text-white px-5 py-2 rounded-full hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
            Console de Test
        </a>
    </div>
</nav>

<div class="flex">
    <!-- Sidebar -->
    <aside class="w-72 h-[calc(100vh-72px)] sticky top-[72px] bg-white border-r border-gray-100 overflow-y-auto p-6 hidden lg:block">
        <div class="space-y-8">
            <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Introduction</h3>
                <ul class="space-y-3">
                    <li><a href="#getting-started" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-rocket w-4"></i> Commencer</a></li>
                    <li><a href="#auth-headers" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-key w-4"></i> Authentification</a></li>
                </ul>
            </div>
            
            <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Endpoints API</h3>
                <ul class="space-y-3">
                    <li><a href="#auth" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-user-lock w-4"></i> Authentification</a></li>
                    <li><a href="#accounts" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-address-book w-4"></i> Comptes & CRM</a></li>
                    <li><a href="#fleet" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-car w-4"></i> Flotte Automobile</a></li>
                    <li><a href="#booking" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-calendar-alt w-4"></i> Rendez-vous</a></li>
                    <li><a href="#quotes" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-file-invoice-dollar w-4"></i> Devis & Photo</a></li>
                    <li><a href="#support" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-headset w-4"></i> Support Clients</a></li>
                </ul>
            </div>

            <div class="pt-6 border-t border-gray-50">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-orange-500">Intégration Angular</h3>
                <ul class="space-y-3">
                    <li><a href="#ng-setup" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-cog w-4"></i> Configuration</a></li>
                    <li><a href="#ng-services" class="text-slate-600 hover:text-emerald-600 flex items-center gap-2"><i class="fas fa-code w-4"></i> Services Classiques</a></li>
                </ul>
            </div>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 md:p-12 max-w-5xl mx-auto overflow-x-hidden">
        
        <!-- Welcome Section -->
        <section id="getting-started" class="mb-20">
            <h1 class="text-4xl font-extrabold text-emerald-950 mb-4">Bienvenue sur le portail Fidelis+</h1>
            <p class="text-lg text-slate-500 max-w-3xl mb-8">
                Documentation interactive et guides d'intégration pour le backend Mayelia Fidelis+. 
                Notre API est de type RESTful, centrée sur la performance et sécurisée par Laravel Sanctum.
            </p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div class="bg-emerald-600 text-white p-8 rounded-3xl shadow-xl shadow-emerald-200 relative overflow-hidden">
                    <div class="relative z-10">
                        <h4 class="text-emerald-100 text-sm font-semibold mb-2">URL de base (Production)</h4>
                        <code class="text-xl font-bold bg-emerald-800/50 px-3 py-1 rounded-lg select-all">https://api.fidelis.com/v1</code>
                    </div>
                    <i class="fas fa-bolt absolute -right-4 -bottom-4 text-9xl text-emerald-500/30"></i>
                </div>
                <div class="bg-white border border-emerald-100 p-8 rounded-3xl shadow-sm">
                    <h4 class="text-emerald-600 text-sm font-semibold mb-2">Format des réponses</h4>
                    <p class="text-slate-500">Toutes les réponses sont au format <span class="font-bold text-slate-700 underline decoration-emerald-400">JSON</span>.</p>
                </div>
            </div>

            <div id="auth-headers" class="bg-slate-900 rounded-3xl p-8 text-white">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                        <i class="fas fa-shield-halved"></i>
                    </div>
                    <h2 class="text-2xl font-bold">Headers d'Authentification</h2>
                </div>
                <p class="text-slate-400 mb-6 font-light">Toutes les routes protégées nécessitent le header suivant :</p>
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 group">
                    <code class="text-emerald-400 font-mono block transition hover:translate-x-1 duration-300">Authorization: Bearer <span class="text-slate-500 select-all">{VOTRE_TOKEN}</span></code>
                </div>
            </div>
        </section>

        <!-- API Modules -->
        <div class="space-y-32">
            
            <!-- Auth Module -->
            <section id="auth">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-slate-900">1. Authentification</h2>
                    <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Module Public</span>
                </div>

                <div class="space-y-6">
                    <!-- Login POST -->
                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                        <div class="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-b border-gray-100">
                            <div class="flex items-center gap-3">
                                <span class="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded">POST</span>
                                <code class="text-emerald-900 font-bold">/auth/login</code>
                            </div>
                            <span class="text-sm text-slate-400 italic">Connexion par Téléphone ou Email</span>
                        </div>
                        <div class="p-8">
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div>
                                    <h5 class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Paramètres Body</h5>
                                    <ul class="space-y-4">
                                        <li>
                                            <div class="flex justify-between font-mono text-sm border-b pb-2">
                                                <span class="text-emerald-600 font-bold">login</span>
                                                <span class="text-red-400">required</span>
                                            </div>
                                            <p class="text-xs text-slate-400 mt-1 italic">Email ou Numéro de téléphone</p>
                                        </li>
                                        <li>
                                            <div class="flex justify-between font-mono text-sm border-b pb-2">
                                                <span class="text-emerald-600 font-bold">password</span>
                                                <span class="text-red-400">required</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div class="bg-slate-50 p-6 rounded-2xl">
                                    <div class="flex justify-between mb-4">
                                        <h5 class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Angular Integration (Classic)</h5>
                                        <i class="fab fa-angular text-red-600 text-xl"></i>
                                    </div>
                                    <pre class="text-[11px] leading-relaxed text-slate-600 bg-white p-4 border rounded-xl overflow-x-auto"><span class="text-emerald-600">login</span>(credentials: any): <span class="text-blue-500">Observable</span>&lt;any&gt; {
  return this.http.<span class="text-emerald-600">post</span>(`${URL}/auth/login`, credentials);
}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Get /me -->
                    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div class="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-b border-gray-100">
                            <div class="flex items-center gap-3">
                                <span class="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">GET</span>
                                <code class="text-emerald-900 font-bold">/auth/me</code>
                            </div>
                            <span class="text-sm text-slate-400 italic">Profil de l'utilisateur connecté</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Accounts & Kanban -->
            <section id="accounts">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-slate-900">2. Comptes & CRM</h2>
                    <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Module Commercial</span>
                </div>
                <div class="bg-emerald-50 border-l-4 border-emerald-400 p-6 rounded-r-2xl mb-8">
                    <p class="text-emerald-800 text-sm">
                        <i class="fas fa-info-circle mr-2"></i>
                        Le CRM gère automatiquement la conversion de <strong>Prospect</strong> vers <strong>Client</strong>.
                    </p>
                </div>
                <!-- CRUD accounts -->
                <div class="grid grid-cols-1 gap-4">
                    <div class="bg-white border rounded-2xl p-4 flex items-center gap-6 group hover:border-emerald-200 transition">
                        <span class="bg-blue-500 text-white px-3 py-1 rounded font-bold text-xs uppercase">GET</span>
                        <div class="flex-1">
                            <code class="text-slate-800 font-bold">/accounts</code>
                            <p class="text-xs text-slate-400 mt-1">Liste les comptes (Filtres: ?type=prospect, ?commercial_id=X)</p>
                        </div>
                        <i class="fas fa-chevron-right text-gray-200 group-hover:text-emerald-400 transition"></i>
                    </div>
                    <div class="bg-white border rounded-2xl p-4 flex items-center gap-6 group hover:border-emerald-200 transition">
                        <span class="bg-orange-500 text-white px-3 py-1 rounded font-bold text-xs uppercase">POST</span>
                        <div class="flex-1">
                            <code class="text-slate-800 font-bold">/accounts/{id}/recharge</code>
                            <p class="text-xs text-slate-400 mt-1">Créditer le solde d'un compte (param: <code class="text-emerald-600">amount</code>)</p>
                        </div>
                        <i class="fas fa-chevron-right text-gray-200 group-hover:text-emerald-400 transition"></i>
                    </div>
                </div>
            </section>

            <!-- Booking Section -->
            <section id="booking">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-slate-900">3. Rendez-vous (Planning)</h2>
                    <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Module Client</span>
                </div>
                
                <div class="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm relative overflow-hidden group">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div>
                            <code class="text-2xl font-bold">/appointments/slots</code>
                            <p class="text-slate-400 text-sm mt-1">Récupère les <span class="font-bold text-emerald-600">5 créneaux fixes</span> par station.</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h5 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Requête Attendue</h5>
                            <div class="bg-slate-50 p-6 rounded-2xl font-mono text-sm space-y-2 border border-slate-100">
                                <p><span class="text-emerald-600">?station_id=</span>1</p>
                                <p><span class="text-emerald-600">?date=</span>2024-12-25</p>
                            </div>
                        </div>
                        <div>
                            <h5 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Créneaux Officiels</h5>
                            <div class="flex flex-wrap gap-2">
                                <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs uppercase shadow-sm">08:30</span>
                                <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs uppercase shadow-sm">10:30</span>
                                <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs uppercase shadow-sm">13:30</span>
                                <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs uppercase shadow-sm">15:30</span>
                                <span class="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs uppercase shadow-sm">17:30</span>
                            </div>
                        </div>
                    </div>
                    <i class="fas fa-calendar-check absolute -right-8 -bottom-8 text-[12rem] text-blue-600/5 group-hover:scale-110 transition duration-700"></i>
                </div>
            </section>

            <!-- Quotes & Photos -->
            <section id="quotes">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-slate-900">4. Devis & Devis Photo</h2>
                    <span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Module Interactif</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded shadow">POST</span>
                            <code class="text-lg font-bold">/quote-requests</code>
                        </div>
                        <p class="text-sm text-slate-500 mb-6 font-light italic">"Le client demande un devis en photographiant sa carte grise et sa vignette."</p>
                        
                        <div class="bg-slate-900 rounded-2xl p-6 text-[11px] font-mono text-emerald-400 space-y-1">
                            <p class="text-slate-500 mb-2">// MULTIPART/FORM-DATA</p>
                            <p><span class="text-slate-100">vehicle_id:</span> 2</p>
                            <p><span class="text-slate-100">registration_image:</span> [File]</p>
                            <p><span class="text-slate-100">vignette_image:</span> [File]</p>
                            <p><span class="text-slate-100">notes:</span> "Besoin urgent"</p>
                        </div>
                    </div>

                    <div class="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-lg transition">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded shadow">POST</span>
                            <code class="text-lg font-bold">/quotes</code>
                        </div>
                        <p class="text-sm text-slate-500 mb-6 font-light italic">"Le commercial génère le devis formel avec lignes tarifaires."</p>
                        
                        <div class="bg-slate-900 rounded-2xl p-6 text-[11px] font-mono text-emerald-400 space-y-1 overflow-x-auto">
                            <p class="text-slate-500 mb-2">// JSON DATA</p>
                            <p><span class="text-slate-100">items:</span> [</p>
                            <p class="pl-4">{ <span class="text-slate-100">"description"</span>: "Visite Tech", <span class="text-slate-100">"price"</span>: 12000 },</p>
                            <p class="pl-4">{ <span class="text-slate-100">"description"</span>: "Lavage", <span class="text-slate-100">"price"</span>: 5000 }</p>
                            <p>]</p>
                        </div>
                    </div>
                </div>
            </section>

        </div>

        <!-- Try it out Section -->
        <section id="try-it-out" class="mt-40 mb-20 bg-emerald-950 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
            <div class="relative z-10">
                <h2 class="text-3xl font-bold mb-4">Console de Test Interactive</h2>
                <p class="text-emerald-300 font-light mb-12">Testez vos appels API en temps réel sur le serveur local.</p>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 space-y-6">
                        <div>
                            <label class="block text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Méthode / Endpoint</label>
                            <select id="try-method" class="w-full bg-emerald-900/50 border border-emerald-800 p-4 rounded-xl text-white appearance-none outline-none focus:ring-2 focus:ring-emerald-400">
                                <option value="GET|/stations">GET /stations</option>
                                <option value="GET|/auth/me">GET /auth/me</option>
                                <option value="GET|/appointments/slots">GET /appointments/slots</option>
                                <option value="POST|/auth/login">POST /auth/login</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Bearer Token (Optionnel)</label>
                            <input id="try-token" type="password" placeholder="JWT Token..." class="w-full bg-emerald-900/50 border border-emerald-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-400">
                        </div>
                        <button onclick="runTest()" class="w-full bg-emerald-500 py-4 rounded-xl font-bold hover:bg-emerald-400 transition transform hover:-translate-y-1 active:scale-95 shadow-lg shadow-emerald-500/20">
                            ENVOYER LA REQUÊTE
                        </button>
                    </div>

                    <div class="lg:col-span-2">
                        <label class="block text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Réponse JSON</label>
                        <div class="bg-black/40 border border-emerald-900 p-6 rounded-2xl h-80 overflow-y-auto overflow-x-auto ring-1 ring-white/5">
                            <pre id="try-result" class="text-emerald-400 text-xs font-mono leading-relaxed">// En attente de test...</pre>
                        </div>
                    </div>
                </div>
            </div>
            <i class="fas fa-terminal absolute -right-20 -bottom-20 text-[20rem] text-white/5 pointer-events-none rotate-12"></i>
        </section>

        <!-- Angular Integration Guide -->
        <section id="ng-setup" class="mb-40 pt-20 border-t border-gray-100">
            <h2 class="text-4xl font-extrabold text-slate-900 mb-8 flex items-center gap-4">
                <i class="fab fa-angular text-red-600"></i>
                Intégration Angular (Classic)
            </h2>

            <!-- Step 1 Service -->
            <div id="ng-services" class="space-y-12">
                <div>
                    <h3 class="text-xl font-bold text-emerald-950 mb-6 flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 inline-flex items-center justify-center text-sm">1</span>
                        Le Service (ApiDataService)
                    </h3>
                    <div class="bg-slate-900 rounded-3xl p-8 shadow-2xl overflow-x-auto">
                        <pre class="text-xs text-sky-200 leading-relaxed"><span class="text-purple-400">@Injectable</span>({ providedIn: 'root' })
<span class="text-blue-400">export class</span> <span class="text-emerald-400">ApiService</span> {
  <span class="text-orange-400">private readonly</span> baseUrl = <span class="text-yellow-200">'http://127.0.0.1:8000/api/v1'</span>;

  <span class="text-blue-400">constructor</span>(<span class="text-orange-400">private</span> http: <span class="text-emerald-400">HttpClient</span>) {}

  <span class="text-slate-500">// Récupérer les créneaux</span>
  <span class="text-emerald-400">getSlots</span>(stationId: <span class="text-blue-400">number</span>, date: <span class="text-blue-400">string</span>): <span class="text-emerald-400">Observable</span>&lt;any&gt; {
    <span class="text-blue-400">return</span> <span class="text-blue-400">this</span>.http.<span class="text-emerald-400">get</span>(`${<span class="text-blue-400">this</span>.baseUrl}/appointments/slots`, {
      params: { <span class="text-orange-400">station_id:</span> stationId, <span class="text-orange-400">date:</span> date }
    });
  }

  <span class="text-slate-500">// Upload Devis Photo (Multipart)</span>
  <span class="text-emerald-400">requestQuote</span>(formData: <span class="text-emerald-400">FormData</span>): <span class="text-emerald-400">Observable</span>&lt;any&gt; {
    <span class="text-blue-400">return</span> <span class="text-blue-400">this</span>.http.<span class="text-emerald-400">post</span>(`${<span class="text-blue-400">this</span>.baseUrl}/quote-requests`, formData);
  }
}</pre>
                    </div>
                </div>

                <!-- Step 2 Component -->
                <div>
                    <h3 class="text-xl font-bold text-emerald-950 mb-6 flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 inline-flex items-center justify-center text-sm">2</span>
                        Appel dans le Composant
                    </h3>
                    <div class="bg-white border rounded-3xl p-8 border-emerald-100 shadow-sm">
                        <pre class="text-xs text-slate-600 leading-relaxed"><span class="text-blue-600">export class</span> <span class="text-emerald-600">DashboardComponent</span> <span class="text-blue-600">implements</span> <span class="text-emerald-600">OnInit</span> {
  <span class="text-slate-400">// Injection via constructeur (Syntaxe Classique)</span>
  <span class="text-blue-600">constructor</span>(<span class="text-blue-600">private</span> api: <span class="text-emerald-600">ApiService</span>) {}

  <span class="text-emerald-600">loadStats</span>() {
    <span class="text-blue-600">this</span>.api.<span class="text-emerald-600">getDashboardStats</span>().<span class="text-orange-600">subscribe</span>({
      <span class="text-emerald-600">next:</span> (res) => <span class="text-blue-600">this</span>.data = res.data,
      <span class="text-emerald-600">error:</span> (err) => <span class="text-red-600">console.error</span>(err)
    });
  }
}</pre>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="mt-40 pt-10 border-t border-gray-100 flex justify-between items-center text-slate-400 text-sm italic">
            <p>&copy; 2024 Mayelia Fidelis+ - Documentation technique gérée par Laravel 13.</p>
            <div class="flex gap-6">
                <a href="#" class="hover:text-emerald-600 transition">GitHub</a>
                <a href="#" class="hover:text-emerald-600 transition">Laravel Docs</a>
            </div>
        </footer>
    </main>
</div>

<!-- Try it out Mobile Modal (Mock) -->
<script>
    async function runTest() {
        const resultEl = document.getElementById('try-result');
        const [method, path] = document.getElementById('try-method').value.split('|');
        const token = document.getElementById('try-token').value;
        const fullUrl = `http://127.0.0.1:8000/api/v1${path}`;

        resultEl.innerText = "// Connexion en cours...";
        resultEl.className = "text-emerald-300 animate-pulse font-mono";

        try {
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(fullUrl, { method, headers });
            const data = await res.json();

            resultEl.innerText = JSON.stringify(data, null, 2);
            resultEl.className = "text-emerald-400 text-xs font-mono leading-relaxed";
        } catch (error) {
            resultEl.innerText = "Erreur: Impossible de joindre l'API. Vérifiez que le serveur Laravel tourne sur http://127.0.0.1:8000";
            resultEl.className = "text-red-400 text-[10px] font-mono leading-relaxed";
        }
    }
</script>

</body>
</html>
