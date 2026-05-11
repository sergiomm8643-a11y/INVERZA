// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);
const listings = [
  {
    id: 1,
    title: "Piso con alto retorno en Ruzafa",
    location: "Valencia · Ruzafa",
    city: "Valencia",
    zone: "Ruzafa",
    type: "Vivienda",
    operation: "Comprar",
    price: "120.000 €",
    roi: "31%",
    profit: "65.000 €",
    status: "Verificado",
    totalCost: "205.000 €",
    saleValue: "270.000 €",
    rentAvg: "15 €/m²",
    demand: "Alta",
    legalStatus: "Libre",
  },
  {
    id: 2,
    title: "Solar para promoción de 3 alturas",
    location: "Elche · Centro",
    city: "Elche",
    zone: "Centro",
    type: "Terreno",
    operation: "Invertir",
    price: "180.000 €",
    roi: "27%",
    profit: "120.000 €",
    status: "Verificado",
    totalCost: "646.900 €",
    saleValue: "825.000 €",
    rentAvg: "—",
    demand: "Alta",
    legalStatus: "Libre",
  },
  {
    id: 3,
    title: "Local con salida por alquiler",
    location: "Alicante · Centro",
    city: "Alicante",
    zone: "Centro",
    type: "Local / Oficina",
    operation: "Alquilar",
    price: "98.000 €",
    roi: "9,2%",
    profit: "Cashflow mensual",
    status: "Verificado",
    totalCost: "126.500 €",
    saleValue: "—",
    rentAvg: "12 €/m²",
    demand: "Media-Alta",
    legalStatus: "Alquilado",
  },
];

const userTypes = [
  {
    key: "seller",
    title: "Propietario / anunciante",
    desc: "Para publicar inmuebles, vender, alquilar, buscar inversor o proponer una permuta.",
  },
  {
    key: "investor",
    title: "Inversor / comprador",
    desc: "Para buscar operaciones, guardar oportunidades, contactar y recibir alertas.",
  },
];

const initialMessages = [
  {
    id: 1,
    sender: "INVERZA",
    text: "Hola. Aquí podrás hablar con vendedores, inversores y compradores.",
  },
  {
    id: 2,
    sender: "Soporte",
    text: "También podremos integrar avisos, seguimiento de operaciones y mensajes privados.",
  },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [realListings, setRealListings] = useState([]);
  

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setPage("panel");
      }
    };

    checkUser();
  }, []);

  useEffect(() => {
    async function loadRealListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "Activo")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error cargando anuncios reales:", error.message);
        return;
      }

      setRealListings(data || []);
    }

    loadRealListings();
  }, []);

  function handleRegister() {
    if (selectedUserType === "investor") {
      saveInvestorProfile({
        name: "Test",
        email: "test@test.com",
      });
    } else {
      setPage("publish");
    }
  }

  const [selectedId, setSelectedId] = useState(1);
  const [selectedMyListing, setSelectedMyListing] = useState(null);
  const [editingMyListingIndex, setEditingMyListingIndex] = useState(null);
  const [favorites, setFavorites] = useState([1]);
  const [messages, setMessages] = useState(initialMessages);
  const [chatInput, setChatInput] = useState("");
const [detailBackPage, setDetailBackPage] = useState("home");
  const [search, setSearch] = useState({
    operation: "Comprar",
    type: "Vivienda",
    city: "Valencia",
    zone: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState("seller");
  const [investorProfile, setInvestorProfile] = useState(() => {
    const saved = localStorage.getItem("investorProfile");
    return saved
      ? JSON.parse(saved)
      : {
          budget: 250000,
          roi: 15,
          strategy: "Flip",
          zones: "Valencia",
          risk: "Medio",
        };
  });

  const selected = listings.find((l) => l.id === selectedId) || listings[0];

  const scoredListings = useMemo(() => {
    return listings
      .map((item) => {
        const price = parseInt(String(item.price).replace(/[^0-9]/g, "")) || 0;
        const roi = parseFloat(String(item.roi).replace(",", ".")) || 0;
        const budgetScore =
          price <= Number(investorProfile.budget || 0) ? 35 : 10;
        const roiTarget = Number(investorProfile.roi || 0);
        const roiScore =
          roi >= roiTarget
            ? 35
            : Math.max(10, 35 - Math.abs(roiTarget - roi) * 2);
        const zoneScore = String(item.city)
          .toLowerCase()
          .includes(String(investorProfile.zones || "").toLowerCase())
          ? 20
          : 8;
        const strategyMap = {
          Flip: ["Comprar", "Invertir"],
          Alquiler: ["Alquilar"],
          Promoción: ["Invertir"],
          Mixto: ["Comprar", "Alquilar", "Invertir", "Permutar"],
        };
        const strategyOk = (
          strategyMap[investorProfile.strategy] || []
        ).includes(item.operation);
        const strategyScore = strategyOk ? 10 : 4;
        const matchScore = Math.min(
          100,
          Math.round(budgetScore + roiScore + zoneScore + strategyScore)
        );
        return { ...item, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [investorProfile]);

  const filteredListings = useMemo(() => {
    return scoredListings.filter((item) => {
      const operationOk =
        !search.operation || item.operation === search.operation;
      const typeOk = !search.type || item.type === search.type;
      const cityOk =
        !search.city ||
        item.city.toLowerCase().includes(search.city.toLowerCase());
      const zoneOk =
        !search.zone ||
        item.zone.toLowerCase().includes(search.zone.toLowerCase());
      return operationOk && typeOk && cityOk && zoneOk;
    });
  }, [search, scoredListings]);

  const favoriteListings = scoredListings.filter((l) =>
    favorites.includes(l.id)
  );

  function openListing(id) {
    setSelectedId(id);
    setPage("listing");
  }

  function toggleFavorite(id) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function runSearch(next = search) {
    setSearch(next);
    setPage("results");
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "Tú", text: chatInput },
    ]);
    setChatInput("");
  }

  function saveInvestorProfile(profile) {
    const normalized = {
      ...profile,
      budget: Number(profile.budget || 0),
      roi: Number(profile.roi || 0),
    };
    setInvestorProfile(normalized);
    localStorage.setItem("investorProfile", JSON.stringify(normalized));
    setPage("panel");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-emerald-50 text-slate-900">
      <Header page={page} setPage={setPage} />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-10">
        {page === "home" && (
          <HomePage
            search={search}
            setSearch={setSearch}
            runSearch={runSearch}
            openListing={openListing}
           featured={realListings.length ? realListings : listings}
            setPage={setPage}
            investorProfile={investorProfile}
            setSelectedMyListing={setSelectedMyListing}
            setDetailBackPage={setDetailBackPage}
          />
        )}

        {page === "results" && (
          <ResultsPage
            search={search}
            setSearch={setSearch}
            runSearch={runSearch}
            results={filteredListings}
            openListing={openListing}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        )}

        {page === "listing" && (
          <ListingPage
            listing={selected}
            isFavorite={favorites.includes(selected.id)}
            toggleFavorite={toggleFavorite}
          />
        )}

       {page === "publish" && <PublishPage setPage={setPage} />} 

        {page === "register" && (
          <RegisterPage
  selectedUserType={selectedUserType}
  setSelectedUserType={setSelectedUserType}
  saveInvestorProfile={saveInvestorProfile}
  setPage={setPage}
/>
        )}

        {page === "panel" && (
          <InvestorPanel
            investorProfile={investorProfile}
            scoredListings={scoredListings}
            openListing={openListing}
          />
        )}

        {page === "favorites" && (
          <FavoritesPage
            favorites={favoriteListings}
            openListing={openListing}
            toggleFavorite={toggleFavorite}
          />
        )}

        {page === "chat" && (
          <ChatPage
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendMessage={sendMessage}
          />
        )}
      
       {page === "profile" && (
  <ProfilePage setPage={setPage} />
)} 
        {page === "settings" && (
  <SettingsPage setPage={setPage} />
)}
       {page === "editProfile" && (
  <EditProfilePage setPage={setPage} />
)} 
       {page === "myListings" && (
 <MyListingsPage
  setPage={setPage}
  setSelectedMyListing={setSelectedMyListing}
  setEditingMyListingIndex={setEditingMyListingIndex}
/>
)}
       {page === "myListingDetail" && (
  <MyListingDetailPage
  listing={selectedMyListing}
  setPage={setPage}
  detailBackPage={detailBackPage}
/>
)} 
        {page === "topOpportunities" && (
  <TopOpportunitiesPage
    listings={realListings}
    setSelectedMyListing={setSelectedMyListing}
    setDetailBackPage={setDetailBackPage}
    setPage={setPage}
  />
)}
       {page === "editMyListing" && (
  <EditMyListingPage
    listing={selectedMyListing}
    listingIndex={editingMyListingIndex}
    setPage={setPage}
  />
)} 
        {page === "login" && (
  <LoginPage setPage={setPage} />
)}
      </main>

      <MobileNav page={page} setPage={setPage} />
    </div>
  );
}

function Header({ page, setPage }) {
  const links = [
    ["home", "Inicio"],
    ["results", "Buscar"],
    ["favorites", "Favoritos"],
    ["chat", "Chat"],
    ["panel", "Panel"],
    ["publish", "Publicar"],
    ["register", "Registro"],
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <button onClick={() => setPage("home")} className="text-left">
          <div className="text-2xl font-black tracking-tight text-emerald-600">
            INVERZA
          </div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
            getinverza.com
          </div>
        </button>

        <nav className="hidden items-center gap-3 md:flex">
          {links.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`rounded-2xl px-4 py-2 text-sm transition ${
                page === key
                  ? "bg-emerald-500 font-bold text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {label}
            </button>
          ))}
          <button
  onClick={() => setPage("profile")}
  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
>
  Mi cuenta
</button>
        </nav>
      </div>
    </header>
  );
}

function HomePage({
  search,
  setSearch,
  runSearch,
  openListing,
  featured,
  setPage,
  investorProfile,
  setSelectedMyListing,
  setDetailBackPage,
}) {
  const personalized = [...featured]
  .filter((item) => {
    const investment = calculateInvestment(item);

    const price = investment.purchasePrice || 0;
    const roi = investment.roi || 0;

    const budgetOk =
      !investorProfile.budget ||
      price <= Number(investorProfile.budget);

    const roiOk =
      !investorProfile.roi ||
      roi >= Number(investorProfile.roi);

    const zoneOk =
      !investorProfile.zones ||
      String(item.city || "")
        .toLowerCase()
        .includes(
          String(investorProfile.zones || "").toLowerCase()
        );

    return budgetOk && roiOk && zoneOk;
  })
  .map((item) => {
    const investment = calculateInvestment(item);

    return {
      ...item,
      investment,
      roiScore: investment.roi || 0,
      profitScore: investment.estimatedProfit || 0,
    };
  })
  .sort((a, b) => {
    if (b.roiScore !== a.roiScore) {
      return b.roiScore - a.roiScore;
    }

    return b.profitScore - a.profitScore;
  });
  const stats = [
    { label: "Oportunidades activas", value: "1.284" },
    { label: "Inversores conectados", value: "426" },
    { label: "Operaciones verificadas", value: "312" },
    { label: "Permutas abiertas", value: "97" },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-sky-50 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.08)] md:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 shadow-sm">
              La red inmobiliaria pensada para inversores
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-slate-900 md:text-6xl">
              Inmuebles con más datos, más salida y{" "}
              <span className="text-emerald-600">más retorno</span>.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              Compra, alquila, invierte o permuta. En INVERZA no solo ves
              anuncios: descubres oportunidades reales con costes, margen y
              potencial de salida.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setPage("register")}
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Crear cuenta
              </button>
             <button
  onClick={() => setPage("publish")}
  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
>
  Publicar inmueble
</button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur"
                >
                  <div className="text-3xl font-black text-slate-900">
                    {item.value}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
            <div className="mb-5 flex flex-wrap gap-3">
              {["Comprar", "Alquilar", "Invertir", "Permutar"].map((item) => (
                <button
                  key={item}
                  onClick={() =>
                    setSearch((prev) => ({ ...prev, operation: item }))
                  }
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                    search.operation === item
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              <SearchField label="Tipo de activo">
                <select
                  value={search.type}
                  onChange={(e) =>
                    setSearch((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                >
                  {[
                    "Vivienda",
                    "Terreno",
                    "Local / Oficina",
                    "Nave industrial",
                    "Edificio",
                    "Garaje",
                    "Trastero",
                    "Vacacional",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </SearchField>

              <SearchField label="Población">
                <input
                  value={search.city}
                  onChange={(e) =>
                    setSearch((p) => ({ ...p, city: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Valencia, Alicante, Elche..."
                />
              </SearchField>

              <SearchField label="Ubicación / zona">
                <input
                  value={search.zone}
                  onChange={(e) =>
                    setSearch((p) => ({ ...p, zone: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ruzafa, Centro, Playa..."
                />
              </SearchField>

              <SearchField label="Precio máximo">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="150.000 €"
                />
              </SearchField>

              <SearchField label="ROI mínimo">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  placeholder="18%"
                />
              </SearchField>

              <div className="flex items-end">
                <button
                  onClick={() => runSearch()}
                  className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-base font-black text-white shadow-sm transition hover:bg-emerald-600"
                >
                  Buscar oportunidades
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
              Búsqueda orientada a inversión: filtra por tipo, población, zona,
              ticket y rentabilidad esperada.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
                Radar INVERZA · Para ti
              </div>
              <h2 className="mt-2 text-3xl font-black text-slate-900">
                Mejores oportunidades del momento
              </h2>
            </div>
            <button
              onClick={() => setPage("topOpportunities")}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Ver todo
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {(personalized.length ? personalized : featured).slice(0, 3).map((item, index) => {
  const investment = item.investment || calculateInvestment(item);

  return (
             <div
  key={item.id}
  className="group rounded-[26px] border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-white">
        #{index + 1}
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900">
          {item.title || `${item.type || "Inmueble"} en ${item.city || "zona pendiente"}`}
        </h3>
        <div className="mt-1 text-sm text-slate-500">
          {item.city || item.location || "Ubicación pendiente"}
        </div>
      </div>
    </div>

    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
      Radar INVERZA
    </div>
  </div>

  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
    <MiniMetric
      label="Valor compra"
      value={item.price || `${investment.purchasePrice.toLocaleString()} €`}
    />

    <MiniMetric
      label="Coste total"
      value={`${investment.totalInvestment.toLocaleString()} €`}
      accent
    />

    <MiniMetric
      label="ROI"
      value={investment.roi ? `${investment.roi.toFixed(1)}%` : "Pendiente"}
      accent
    />
  </div>

  <div className="mt-5 flex justify-end">
    <button
      onClick={() => {
       setSelectedMyListing(item);
setDetailBackPage("home");
setPage("myListingDetail"); 
      }}
      className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-600"
    >
      Ver oportunidad
    </button>
  </div>
</div>
  );
})}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[30px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-700">
              Publicar tu inmueble
            </div>
            <h2 className="mt-2 text-3xl font-black text-slate-900">
              Convierte tu activo en oportunidad
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              Publica venta, alquiler, búsqueda de inversor o permuta. Muestra
              más datos y acelera la salida del inmueble con una ficha mucho más
              potente que un portal normal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setPage("publish")}
                className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                Publicar ahora
              </button>
              <button
                onClick={() => setPage("register")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                Crear cuenta
              </button>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
              Accesos rápidos
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                "Comprar",
                "Alquilar",
                "Invertir",
                "Permutar",
                "Publicar inmueble",
                "Buscar inversor",
              ].map((item) => (
                <button
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultsPage({
  search,
  setSearch,
  runSearch,
  results,
  openListing,
  favorites,
  toggleFavorite,
  showFilters,
  setShowFilters,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <select
            value={search.operation}
            onChange={(e) =>
              setSearch((p) => ({ ...p, operation: e.target.value }))
            }
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          >
            {["Comprar", "Alquilar", "Invertir", "Permutar"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={search.type}
            onChange={(e) => setSearch((p) => ({ ...p, type: e.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          >
            {[
              "Vivienda",
              "Terreno",
              "Local / Oficina",
              "Nave industrial",
              "Edificio",
              "Garaje",
              "Trastero",
              "Vacacional",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input
            value={search.city}
            onChange={(e) => setSearch((p) => ({ ...p, city: e.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            placeholder="Población"
          />
          <input
            value={search.zone}
            onChange={(e) => setSearch((p) => ({ ...p, zone: e.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            placeholder="Zona"
          />
          <button
            onClick={() => runSearch()}
            className="rounded-2xl bg-emerald-500 font-bold text-white shadow-sm transition hover:bg-emerald-600"
          >
            Buscar
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-600">
            Búsqueda activa
          </div>
          <div className="mt-2 text-lg text-slate-600">
            Resultados para{" "}
            <span className="font-bold text-slate-900">
              {search.operation} {search.type} en{" "}
              {search.city || "todas las zonas"}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            {showFilters ? "Ocultar filtros" : "Filtros"}
          </button>
          <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Ordenar por ROI
          </button>
        </div>
      </section>

      {showFilters && (
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              placeholder="Precio máximo"
            />
            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              placeholder="ROI mínimo"
            />
            <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100">
              <option>Estado legal</option>
              <option>Libre</option>
              <option>Alquilado</option>
            </select>
            <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100">
              <option>Demanda</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </div>
        </section>
      )}

      <div className="space-y-4">
        {results.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            No hay resultados exactos con esta búsqueda todavía.
          </div>
        )}

        {results.map((item) => (
          <div
            key={item.id}
            className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
          >
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-slate-500">{item.location}</p>
                    <div className="mt-3 flex gap-2 text-sm flex-wrap">
                      <Badge text={item.type} />
                      <Badge text={item.operation} />
                     <Badge text={item.legalStatus || item.legal_status || "Libre"} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-600">
                      {item.roi}
                    </div>
                    <div className="text-sm text-slate-500">ROI</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
                  <MiniMetric label="Precio" value={item.price} />
                  <MiniMetric label="Coste total" value={item.totalCost} />
                  <MiniMetric label="Venta estimada" value={item.saleValue} />
                  <MiniMetric label="Beneficio" value={item.profit} accent />
                  <MiniMetric label="Demanda" value={item.demand} />
                  <MiniMetric
                    label="Match"
                    value={`${item.matchScore}%`}
                    accent
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Lectura rápida
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Estado:
                    </span>{" "}
                    {item.status}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Alquiler medio:
                    </span>{" "}
                    {item.rentAvg}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Salida:
                    </span>{" "}
                    {item.operation}
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => openListing(item.id)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-600"
                  >
                    Ver oportunidad
                  </button>
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {favorites.includes(item.id)
                      ? "Quitar de favoritos"
                      : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingPage({ listing, isFavorite, toggleFavorite }) {
  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-bold text-emerald-600">
            OPORTUNIDAD ALTA
          </div>
          <h1 className="mt-2 text-4xl font-black text-slate-900">
            {listing.title}
          </h1>
          <p className="mt-2 text-slate-500">{listing.location}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge text={`Tipo: ${listing.type}`} />
            <Badge text={`Operación: ${listing.operation}`} />
            <Badge text={`Estado legal: ${listing.legalStatus}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <MiniMetric label="Compra" value={listing.price} />
          <MiniMetric label="Coste total" value={listing.totalCost} />
          <MiniMetric label="Venta estimada" value={listing.saleValue} />
          <MiniMetric label="Beneficio" value={listing.profit} accent />
          <MiniMetric label="ROI" value={listing.roi} accent />
          <MiniMetric label="Demanda" value={listing.demand} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-emerald-600">
            {listing.roi} ROI
          </div>
          <div className="text-slate-500">Ficha completa de oportunidad</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleFavorite(listing.id)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"
          >
            {isFavorite ? "Quitar favorito" : "Guardar"}
          </button>
          <button className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white">
            Quiero esta operación
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Datos de mercado">
          <div className="grid grid-cols-2 gap-4">
            <MiniMetric label="Precio zona" value="3.200 €/m²" />
            <MiniMetric label="Alquiler medio" value={listing.rentAvg} />
            <MiniMetric label="Demanda" value={listing.demand} accent />
            <MiniMetric label="Estado" value={listing.status} />
          </div>
        </Panel>

        <Panel title="Imágenes y planos">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              Foto
            </div>
            <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              Plano
            </div>
            <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              Render
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PublishPage({ setPage }) {
 const [newListing, setNewListing] = useState({
  title: "",
  type: "Vivienda",
  operation: "Venta",
  province: "Valencia",
  city: "",
  location: "",
  hideAddress: false,
  price: "",
  m2Housing: "",
  m2Plot: "",
  bedrooms: "",
  bathrooms: "",
  units: "1",
  legalStatus: "Libre",
  propertyStatus: "Para entrar a vivir",
  exitOptions: [],
  description: "",
  status: "Activo",
  media: [],
   estimatedSaleM2: "",
});
 const propertyTypes = [
  "Terreno",
  "Vivienda",
  "Habitaciones",
  "Oficinas",
  "Locales o naves",
  "Traspasos",
  "Garajes",
  "Trasteros",
  "Edificios",
  "Vacacionales",
];

const operations = ["Venta", "Alquiler", "Buscar inversor", "Permuta"];

const legalStatuses = ["Libre", "Alquilado", "Ocupado ilegalmente"];

const propertyStatuses = [
  "Para entrar a vivir",
  "Lavado de cara",
  "Reforma parcial",
  "Reforma integral",
];

function updateListing(key, value) {
  setNewListing((p) => ({ ...p, [key]: value }));
}

function toggleExitOption(option) {
  setNewListing((p) => {
    const exists = p.exitOptions.includes(option);
    return {
      ...p,
      exitOptions: exists
        ? p.exitOptions.filter((x) => x !== option)
        : [...p.exitOptions, option],
    };
  });
} 
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-slate-900">Publicar inmueble</h1>

     <Panel title="Datos básicos">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div>
      <label>Tipo de inmueble</label>
      <select
        value={newListing.type}
        onChange={(e) => updateListing("type", e.target.value)}
      >
        {propertyTypes.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>

    <div>
      <label>Operación</label>
      <select
        value={newListing.operation}
        onChange={(e) => updateListing("operation", e.target.value)}
      >
        {operations.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>

    <ProvinceSelect
      value={newListing.province}
      onChange={(e) => updateListing("province", e.target.value)}
    />

    <Field
      label="Municipio"
      placeholder="Valencia, Alicante, Elche..."
      onChange={(e) => updateListing("city", e.target.value)}
    />

    <Field
      label="Dirección / ubicación"
      placeholder="Calle, número, urbanización..."
      onChange={(e) => updateListing("location", e.target.value)}
    />

    <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <input
        type="checkbox"
        checked={newListing.hideAddress}
        onChange={(e) => updateListing("hideAddress", e.target.checked)}
        style={{ width: "18px" }}
      />
      Ocultar dirección exacta al público
    </label>

    <Field
      label="Título del anuncio"
      placeholder="Ej: Piso con alto potencial en Ruzafa"
      onChange={(e) => updateListing("title", e.target.value)}
    />

    <Field
      label="Precio"
      placeholder="120.000 €"
      onChange={(e) => updateListing("price", e.target.value)}
    />
  </div>
</Panel>

<Panel title="Características del inmueble">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <Field
      label="M2 vivienda"
      placeholder="85"
      onChange={(e) => updateListing("m2Housing", e.target.value)}
    />
<Field
  label="Venta estimada €/m² zona"
  placeholder="3.200"
  onChange={(e) => updateListing("estimatedSaleM2", e.target.value)}
/>
    <Field
      label="M2 parcela"
      placeholder="120"
      onChange={(e) => updateListing("m2Plot", e.target.value)}
    />

    <Field
      label="Unidades"
      placeholder="1"
      onChange={(e) => updateListing("units", e.target.value)}
    />

    <Field
      label="Habitaciones"
      placeholder="3"
      onChange={(e) => updateListing("bedrooms", e.target.value)}
    />

    <Field
      label="Baños"
      placeholder="2"
      onChange={(e) => updateListing("bathrooms", e.target.value)}
    />

    <div>
      <label>Estado del inmueble</label>
      <select
        value={newListing.propertyStatus}
        onChange={(e) => updateListing("propertyStatus", e.target.value)}
      >
        {propertyStatuses.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>

    <div>
      <label>Estado legal</label>
      <select
        value={newListing.legalStatus}
        onChange={(e) => updateListing("legalStatus", e.target.value)}
      >
        {legalStatuses.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </div>
  </div>
</Panel>

<Panel title="Opciones de salida">
  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
    {["Venta directa", "Alquiler", "Buscar inversor", "Permuta"].map((item) => {
      const active = newListing.exitOptions.includes(item);

      return (
        <button
          key={item}
          type="button"
          onClick={() => toggleExitOption(item)}
          className={`rounded-xl border px-4 py-4 font-semibold ${
            active
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {active ? "✓ " : ""}
          {item}
        </button>
      );
    })}
  </div>
</Panel>

<Panel title="Descripción">
  <textarea
    rows="6"
    placeholder="Describe el inmueble, su estado, oportunidad, potencial de reforma, rentabilidad o motivo de venta..."
    value={newListing.description}
    onChange={(e) => updateListing("description", e.target.value)}
  />
</Panel>
<Panel title="Fotos y vídeos">
  <input
    type="file"
    accept="image/*,video/*"
    multiple
    onChange={async (e) => {
      const files = Array.from(e.target.files || []);
      const uploadedMedia = [];

      for (const file of files) {
        const filePath = `${Date.now()}-${file.name}`;

        const { error } = await supabase.storage
          .from("listing-media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (error) {
          alert("Error subiendo archivo: " + error.message);
          return;
        }

        const { data } = supabase.storage
          .from("listing-media")
          .getPublicUrl(filePath);

        uploadedMedia.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type.startsWith("video") ? "video" : "image",
          url: data.publicUrl,
        });
      }

      setNewListing((p) => ({
        ...p,
        media: [...(p.media || []), ...uploadedMedia],
      }));
    }}
  />

  {newListing.media.length > 0 && (
    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      {newListing.media.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-2">
          {item.type === "image" ? (
            <img
              src={item.url}
              alt={item.name}
              style={{
                width: "100%",
                height: "120px",
                objectFit: "cover",
                borderRadius: "14px",
              }}
            />
          ) : (
            <video
              src={item.url}
              controls
              style={{
                width: "100%",
                height: "120px",
                objectFit: "cover",
                borderRadius: "14px",
              }}
            />
          )}
          <div className="mt-2 text-xs text-slate-500">{item.name}</div>
        </div>
      ))}
    </div>
  )}
</Panel>
     <button
 onClick={async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Debes iniciar sesión para publicar");
    setPage("login");
    return;
  }

  const listingToSave = {
    user_id: user.id,
    title:
      newListing.title ||
      `${newListing.type || "Inmueble"} en ${
        newListing.location || "ubicación pendiente"
      }`,
    type: newListing.type,
    operation: newListing.operation,
    province: newListing.province,
    city: newListing.city,
    location: newListing.location,
    price: newListing.price,
    estimated_sale_m2: newListing.estimatedSaleM2,
    status: newListing.status || "Activo",
    hide_address: newListing.hideAddress,
m2_housing: newListing.m2Housing,
m2_plot: newListing.m2Plot,
bedrooms: newListing.bedrooms,
bathrooms: newListing.bathrooms,
units: newListing.units,
legal_status: newListing.legalStatus,
property_status: newListing.propertyStatus,
exit_options: newListing.exitOptions,
description: newListing.description,
    media: newListing.media || [],
  };

  const { error } = await supabase.from("listings").insert(listingToSave);

  if (error) {
    alert("Error publicando anuncio: " + error.message);
    return;
  }

  alert("Inmueble publicado correctamente");
  setPage("myListings");
}}
  className="w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white shadow-sm"
>
  Publicar inmueble
</button>
    </div>
  );
}

function RegisterPage({ selectedUserType, setSelectedUserType, saveInvestorProfile, setPage }) {
const [showPassword, setShowPassword] = useState(false);
const [acceptedLegal, setAcceptedLegal] = useState(false);
const [error, setError] = useState("");
  const [formProfile, setFormProfile] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    province: "Valencia",
    advertiserType: "Particular",
    budget: 250000,
    roi: 15,
    strategy: "Flip",
    zones: "Valencia",
    risk: "Medio",
  });

  async function createAccount() {
  if (!acceptedLegal) {
    setError("Debes aceptar la política de privacidad y condiciones de uso.");
    return;
  }

  if (!formProfile.email || !formProfile.password) {
    setError("Introduce correo electrónico y contraseña.");
    return;
  }

  if (formProfile.password !== formProfile.confirmPassword) {
    setError("Las contraseñas no coinciden.");
    return;
  }

  setError("");

  const { data, error } = await supabase.auth.signUp({
    email: formProfile.email,
    password: formProfile.password,
    options: {
      data: {
        name: formProfile.name,
        surname: formProfile.surname,
        phone: formProfile.phone,
        user_type: selectedUserType,
        province: formProfile.province,
        advertiser_type: formProfile.advertiserType,
        budget: formProfile.budget,
        roi: formProfile.roi,
        strategy: formProfile.strategy,
        zones: formProfile.zones,
        risk: formProfile.risk,
      },
    },
  });

 if (error) {
  console.log("ERROR SUPABASE:", error);
  alert("Error Supabase: " + error.message);
  setError(error.message);
  return;
}

console.log("USUARIO CREADO:", data);
alert("Respuesta Supabase: " + JSON.stringify(data));

  alert("Cuenta creada. Revisa tu email para confirmar el registro.");

  if (selectedUserType === "investor") {
    saveInvestorProfile(formProfile);
  } else {
    localStorage.setItem("sellerProfile", JSON.stringify(formProfile));
    setPage("publish");
  }
}
  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-emerald-50/40 to-sky-50 p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
          Registro INVERZA
        </div>
        <h1 className="mt-4 text-4xl font-black text-slate-900">
          Crea tu cuenta según tu perfil
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Regístrate como propietario/anunciante o como inversor/comprador.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Elige tu perfil">
          <div className="grid gap-4">
            {userTypes.map((item) => {
              const active = selectedUserType === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedUserType(item.key)}
                  className={`rounded-[24px] border p-5 text-left transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/60"
                  }`}
                >
                  <div className="text-lg font-bold text-slate-900">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={selectedUserType === "seller" ? "Registro de propietario / anunciante" : "Registro de inversor / comprador"}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre" placeholder="Tu nombre" onChange={(e) => setFormProfile(p => ({ ...p, name: e.target.value }))} />
            <Field label="Apellidos" placeholder="Tus apellidos" onChange={(e) => setFormProfile(p => ({ ...p, surname: e.target.value }))} />
            <Field label="Correo electrónico" placeholder="correo@ejemplo.com" onChange={(e) => setFormProfile(p => ({ ...p, email: e.target.value }))} />
            <Field label="Teléfono" placeholder="600 000 000" onChange={(e) => setFormProfile(p => ({ ...p, phone: e.target.value }))} />

            <PasswordField label="Contraseña" showPassword={showPassword} setShowPassword={setShowPassword} onChange={(e) => setFormProfile(p => ({ ...p, password: e.target.value }))} />
            <PasswordField label="Confirmar contraseña" showPassword={showPassword} setShowPassword={setShowPassword} onChange={(e) => setFormProfile(p => ({ ...p, confirmPassword: e.target.value }))} />

            <ProvinceSelect value={formProfile.province} onChange={(e) => setFormProfile(p => ({ ...p, province: e.target.value }))} />

            {selectedUserType === "seller" ? (
              <div>
                <label>Tipo de anunciante</label>
                <select onChange={(e) => setFormProfile(p => ({ ...p, advertiserType: e.target.value }))}>
                  <option>Particular</option>
                  <option>Agencia inmobiliaria</option>
                  <option>Promotor</option>
                  <option>Constructor</option>
                  <option>Empresa patrimonial</option>
                </select>
              </div>
            ) : (
              <>
                <Field label="Presupuesto máximo" placeholder="250000" onChange={(e) => setFormProfile(p => ({ ...p, budget: e.target.value }))} />
                <Field label="ROI objetivo" placeholder="20" onChange={(e) => setFormProfile(p => ({ ...p, roi: e.target.value }))} />
                <Field label="Zonas de interés" placeholder="Valencia, Alicante..." onChange={(e) => setFormProfile(p => ({ ...p, zones: e.target.value }))} />
              </>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-slate-700">
            <label style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={acceptedLegal}
                onChange={(e) => setAcceptedLegal(e.target.checked)}
                style={{ width: "18px", marginTop: "3px" }}
              />
              <span>
                Acepto la política de privacidad, condiciones de uso y el tratamiento de mis datos conforme a la normativa de protección de datos.
              </span>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={createAccount}
              className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              Crear cuenta
            </button>

          
 <button
  onClick={() => setPage("login")}
  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
>
  Ya tengo cuenta
</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function InvestorPanel({ investorProfile, scoredListings, openListing }) {
  const topMatches = scoredListings.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-emerald-50/40 to-sky-50 p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
          Panel de inversor
        </div>
        <h1 className="mt-4 text-4xl font-black text-slate-900">
          Tus preferencias y oportunidades compatibles
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          INVERZA empieza a priorizar operaciones según tu presupuesto, retorno
          objetivo, zonas y estrategia de inversión.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniMetric label="Presupuesto" value={`${investorProfile.budget} €`} />
        <MiniMetric
          label="ROI objetivo"
          value={`${investorProfile.roi}%`}
          accent
        />
        <MiniMetric label="Zona" value={investorProfile.zones} />
        <MiniMetric label="Estrategia" value={investorProfile.strategy} />
      </div>

      <Panel title="Mejores oportunidades para ti">
        <div className="grid gap-4">
          {topMatches.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.location}
                  </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Match {item.matchScore}%
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniMetric label="Compra" value={item.price} />
                <MiniMetric label="ROI" value={item.roi} accent />
                <MiniMetric label="Beneficio" value={item.profit} />
                <MiniMetric label="Demanda" value={item.demand} />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => openListing(item.id)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-emerald-600"
                >
                  Ver oportunidad
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function FavoritesPage({ favorites, openListing, toggleFavorite }) {
  return (
    <div>
      <h1 className="text-4xl font-black text-slate-900">Favoritos</h1>
      <p className="mt-3 text-slate-500">
        Tus oportunidades guardadas para revisar más tarde.
      </p>

      <div className="mt-6 space-y-4">
        {favorites.length === 0 && (
          <EmptyCard text="Todavía no has guardado oportunidades." />
        )}
        {favorites.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-slate-500">{item.location}</p>
              </div>
              <div className="text-emerald-600 font-bold">ROI {item.roi}</div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => openListing(item.id)}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white"
              >
                Ver
              </button>
              <button
                onClick={() => toggleFavorite(item.id)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPage({ messages, chatInput, setChatInput, sendMessage }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Panel title="Conversaciones">
        <div className="space-y-3">
          {[
            "Propietario Ruzafa",
            "Inversor promoción Elche",
            "Soporte INVERZA",
          ].map((item) => (
            <button
              key={item}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {item}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Chat">
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl p-4 ${
                m.sender === "Tú"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              <div className="text-xs font-bold uppercase opacity-70">
                {m.sender}
              </div>
              <div className="mt-2">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Escribe un mensaje..."
          />
          <button
            onClick={sendMessage}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white"
          >
            Enviar
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function SearchField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Field({ label, placeholder, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-600">{label}</label>
      <input
        type={type}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordField({ label, showPassword, setShowPassword, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-600">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          onChange={onChange}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          placeholder="••••••••"
          style={{ paddingRight: "55px" }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: 0,
            fontSize: "18px",
          }}
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}

function ProvinceSelect({ value, onChange }) {
  const provinces = [
    "A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
    "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria",
    "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada",
    "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaén",
    "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga",
    "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca",
    "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona",
    "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"
  ];

  return (
    <div>
      <label className="mb-2 block text-sm text-slate-600">Provincia principal</label>
      <input
        list="provincias-es"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
        placeholder="Selecciona provincia"
      />
      <datalist id="provincias-es">
        {provinces.map((province) => (
          <option key={province} value={province} />
        ))}
      </datalist>
    </div>
  );
}

function MiniMetric({ label, value, accent = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 text-sm font-bold ${
          accent ? "text-emerald-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Badge({ text }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 border border-emerald-100">
      {text}
    </span>
  );
}

function EmptyCard({ text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
      {text}
    </div>
  );
}
function LoginPage({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    alert("Bienvenido");

    setPage("panel");
  }

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <h1 className="text-3xl font-black text-slate-900">
        Iniciar sesión
      </h1>

      <input
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-2xl border p-3"
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-2xl border p-3"
      />

      <button
        onClick={handleLogin}
        className="w-full rounded-2xl bg-emerald-500 p-3 font-bold text-white"
      >
        Iniciar sesión
      </button>

      <button
        onClick={() => setPage("register")}
        className="text-sm text-emerald-600"
      >
        Crear cuenta nueva
      </button>
    </div>
  );
}
function EditProfilePage({ setPage }) {
  const [profile, setProfile] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    province: "Valencia",
    userType: "Propietario / anunciante",
  });

  async function saveProfile() {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    alert("Perfil guardado correctamente");
    setPage("profile");
  }

  async function changePassword() {
    if (!profile.email) {
      alert("Introduce tu email para enviarte el cambio de contraseña");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: "https://getinverza.com",
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    alert("Te hemos enviado un email para cambiar la contraseña");
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setPage("profile")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
      >
        ← Volver a mi cuenta
      </button>

      <Panel title="Editar perfil">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre" placeholder="Tu nombre" onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Field label="Apellidos" placeholder="Tus apellidos" onChange={(e) => setProfile(p => ({ ...p, surname: e.target.value }))} />
          <Field label="Email" placeholder="correo@ejemplo.com" onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} />
          <Field label="Teléfono" placeholder="600 000 000" onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} />
          <ProvinceSelect value={profile.province} onChange={(e) => setProfile(p => ({ ...p, province: e.target.value }))} />

          <div>
            <label>Tipo de usuario</label>
            <select onChange={(e) => setProfile(p => ({ ...p, userType: e.target.value }))}>
              <option>Propietario / anunciante</option>
              <option>Inversor / comprador</option>
              <option>Profesional inmobiliario</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={saveProfile}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white"
          >
            Guardar perfil
          </button>

          <button
            onClick={changePassword}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
          >
            Cambiar contraseña
          </button>
        </div>
      </Panel>
    </div>
  );
}
function ProfilePage({ setPage }) {
  async function handleLogout() {
    await supabase.auth.signOut();
    setPage("home");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-4xl font-black text-slate-900">
        Mi cuenta
      </h1>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Mi perfil</h2>
          <p className="text-slate-500 mt-2">
            Edita tus datos personales
          </p>

          <button
  onClick={() => setPage("editProfile")}
  className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white"
>
  Editar perfil
</button>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Mis anuncios</h2>
          <p className="text-slate-500 mt-2">
            Gestiona tus inmuebles publicados
          </p>
          <button
  onClick={() => setPage("myListings")}
  className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white"
>
  Ver mis anuncios
</button>
        </div>

        <div className="rounded-2xl border p-5">
  <h2 className="text-xl font-bold">Favoritos</h2>
  <p className="text-slate-500 mt-2">
    Tus oportunidades guardadas
  </p>

  <button
    onClick={() => setPage("favorites")}
    className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white"
  >
    Ver favoritos
  </button>
</div>

        <div className="rounded-2xl border p-5">
  <h2 className="text-xl font-bold">Ajustes</h2>
  <p className="text-slate-500 mt-2">
    Preferencias y notificaciones
  </p>

  <button
    onClick={() => setPage("settings")}
    className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white"
  >
    Abrir ajustes
  </button>
</div>

      </div>

      <button
        onClick={handleLogout}
        className="rounded-2xl bg-red-500 px-5 py-3 text-white font-bold"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
function MyListingsPage({ setPage, setSelectedMyListing, setEditingMyListingIndex }) {
  const [myListings, setMyListings] = useState([]);

useEffect(() => {
  async function loadMyListings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando anuncios: " + error.message);
      return;
    }

    setMyListings(data || []);
  }

  loadMyListings();
}, []);

  return (
    <div className="space-y-6">
      <button
        onClick={() => setPage("profile")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
      >
        ← Volver a mi cuenta
      </button>

      <h1 className="text-4xl font-black text-slate-900">
        Mis anuncios
      </h1>

      <button
        onClick={() => setPage("publish")}
        className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white"
      >
        + Publicar nuevo inmueble
      </button>

      <div className="space-y-4">
        {myListings.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
            No tienes anuncios publicados todavía.
          </div>
        )}

        {myListings.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-xl font-bold text-slate-900">
              {item.title || "Inmueble"}
            </h3>
            <p className="text-slate-500">
              {item.location || "Ubicación no definida"}
            </p>

            <div className="mt-3 flex gap-3">
             <button
  onClick={() => {
    setSelectedMyListing(item);
    setPage("myListingDetail");
  }}
  className="rounded-xl bg-emerald-500 px-4 py-2 text-white"
>
  Ver
</button>

              <button
  onClick={() => {
    setSelectedMyListing(item);
    setEditingMyListingIndex(index);
    setPage("editMyListing");
  }}
  className="rounded-xl border px-4 py-2"
>
  Editar
</button>

           <button
  onClick={async () => {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Error eliminando anuncio: " + error.message);
      return;
    }

    setMyListings((prev) => prev.filter((x) => x.id !== item.id));
  }}
  className="rounded-xl border px-4 py-2 text-red-500"
>
  Eliminar
</button> 
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function calculateInvestment(listing) {
  const parseMoney = (value) =>
    Number(String(value || "").replace(/[^0-9]/g, "")) || 0;

  const purchasePrice = parseMoney(listing.price);
  const m2 =
    Number(listing.m2_housing || listing.m2Housing || listing.m2 || 0) || 0;

  const reformCosts = {
    "Para entrar a vivir": 0,
    "Lavado de cara": 200,
    "Reforma parcial": 400,
    "Reforma integral": 700,
    "Construcción nueva": 1800,
  };

  const status =
    listing.property_status ||
    listing.propertyStatus ||
    "Para entrar a vivir";

  const reformCostPerM2 = reformCosts[status] ?? 0;
  const worksCost = m2 * reformCostPerM2;

  const purchaseTaxes = purchasePrice * 0.1;
  const managementCosts = purchasePrice * 0.03;

  const totalInvestment =
    purchasePrice + purchaseTaxes + managementCosts + worksCost;

  const estimatedSalePricePerM2 =
    Number(listing.estimated_sale_m2 || listing.estimatedSaleM2 || 0) || 0;

  const estimatedSalePrice =
    estimatedSalePricePerM2 > 0
      ? estimatedSalePricePerM2 * m2
      : 0;

  const estimatedProfit =
    estimatedSalePrice > 0 ? estimatedSalePrice - totalInvestment : 0;

  const roi =
    totalInvestment > 0 && estimatedProfit > 0
      ? (estimatedProfit / totalInvestment) * 100
      : 0;

  return {
    purchasePrice,
    m2,
    status,
    reformCostPerM2,
    worksCost,
    purchaseTaxes,
    managementCosts,
    totalInvestment,
    estimatedSalePricePerM2,
    estimatedSalePrice,
    estimatedProfit,
    roi,
  };
}
  function MyListingDetailPage({ listing, setPage, detailBackPage = "home" }) {
   const investment = calculateInvestment(listing || {}); 
  if (!listing) {
    return (
      <div className="space-y-4">
        <button onClick={() => setPage(detailBackPage)}>
          ← Volver
        </button>
        <p>No se ha encontrado el anuncio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setPage("myListings")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
      >
        ← Volver a mis anuncios
      </button>
{listing.media && listing.media.length > 0 && (
  <Panel title="Galería">
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {listing.media[0].type === "image" ? (
          <img
            src={listing.media[0].url}
            alt={listing.media[0].name}
            style={{ width: "100%", maxHeight: "420px", objectFit: "cover", borderRadius: "18px" }}
          />
        ) : (
          <video
            src={listing.media[0].url}
            controls
            style={{ width: "100%", maxHeight: "420px", objectFit: "cover", borderRadius: "18px" }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {listing.media.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-2">
            {item.type === "image" ? (
              <img
                src={item.url}
                alt={item.name}
                style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "10px" }}
              />
            ) : (
              <video
                src={item.url}
                style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "10px" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </Panel>
)}
      <Panel title={listing.title || "Detalle del anuncio"}>
       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <MiniMetric label="Tipo inmueble" value={listing.type || "-"} />
  <MiniMetric label="Operación" value={listing.operation || "-"} />
  <MiniMetric label="Provincia" value={listing.province || "-"} />

  <MiniMetric label="Municipio" value={listing.city || "-"} />
  <MiniMetric label="Ubicación" value={listing.location || "-"} />
  <MiniMetric label="Precio" value={listing.price || "-"} accent />

  <MiniMetric label="M2 vivienda" value={listing.m2_housing || "-"} />
  <MiniMetric label="M2 parcela" value={listing.m2_plot || "-"} />
  <MiniMetric label="Unidades" value={listing.units || "-"} />

  <MiniMetric label="Habitaciones" value={listing.bedrooms || "-"} />
  <MiniMetric label="Baños" value={listing.bathrooms || "-"} />
  <MiniMetric label="Estado legal" value={listing.legal_status || "-"} />

  <MiniMetric label="Estado inmueble" value={listing.property_status || "-"} />
  <MiniMetric label="Estado anuncio" value={listing.status || "-"} />

  <MiniMetric
    label="Publicado"
    value={
      listing.created_at
        ? new Date(listing.created_at).toLocaleDateString()
        : "-"
    }
  />
</div>
        {listing.exit_options && listing.exit_options.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-bold text-slate-900">
      Opciones de salida
    </h3>

    <div className="mt-3 flex flex-wrap gap-3">
      {listing.exit_options.map((item) => (
        <div
          key={item}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
        >
          {item}
        </div>
      ))}
    </div>
  </div>
)}

{listing.description && (
  <div className="mt-6">
    <h3 className="text-lg font-bold text-slate-900">
      Descripción
    </h3>

    <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
      {listing.description}
    </p>
  </div>
)}
      </Panel>
      <Panel title="Análisis de inversión INVERZA">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <MiniMetric label="Precio compra" value={`${investment.purchasePrice.toLocaleString()} €`} />
    <MiniMetric label="Impuestos y gastos" value={`${investment.purchaseTaxes.toLocaleString()} €`} />
    <MiniMetric label="Gestión / varios" value={`${investment.managementCosts.toLocaleString()} €`} />

    <MiniMetric label="Estado inmueble" value={investment.status} />
    <MiniMetric label="Coste obra €/m²" value={`${investment.reformCostPerM2} €/m²`} />
    <MiniMetric label="Coste obra total" value={`${investment.worksCost.toLocaleString()} €`} />

    <MiniMetric label="Inversión total" value={`${investment.totalInvestment.toLocaleString()} €`} accent />
    <MiniMetric label="Venta estimada" value={investment.estimatedSalePrice ? `${investment.estimatedSalePrice.toLocaleString()} €` : "Pendiente valor zona"} />
    <MiniMetric label="Beneficio estimado" value={investment.estimatedProfit ? `${investment.estimatedProfit.toLocaleString()} €` : "Pendiente"} accent />

    <MiniMetric label="ROI estimado" value={investment.roi ? `${investment.roi.toFixed(1)}%` : "Pendiente"} accent />
  </div>
</Panel>
    </div>
  );
}
function EditMyListingPage({ listing, listingIndex, setPage }) {
  const [form, setForm] = useState({
    title: listing?.title || "",
    type: listing?.type || "Vivienda",
    operation: listing?.operation || "Venta",
    province: listing?.province || "Valencia",
    city: listing?.city || "",
    location: listing?.location || "",
    hide_address: listing?.hide_address || false,
    price: listing?.price || "",
    estimated_sale_m2: listing?.estimated_sale_m2 || "",
    m2_housing: listing?.m2_housing || "",
    m2_plot: listing?.m2_plot || "",
    bedrooms: listing?.bedrooms || "",
    bathrooms: listing?.bathrooms || "",
    units: listing?.units || "1",
    legal_status: listing?.legal_status || "Libre",
    property_status: listing?.property_status || "Para entrar a vivir",
    exit_options: listing?.exit_options || [],
    description: listing?.description || "",
    status: listing?.status || "Activo",
    media: listing?.media || [],
  });

  const propertyTypes = [
    "Terreno",
    "Vivienda",
    "Habitaciones",
    "Oficinas",
    "Locales o naves",
    "Traspasos",
    "Garajes",
    "Trasteros",
    "Edificios",
    "Vacacionales",
  ];

  const operations = ["Venta", "Alquiler", "Buscar inversor", "Permuta"];
  const legalStatuses = ["Libre", "Alquilado", "Ocupado ilegalmente"];
  const propertyStatuses = [
    "Para entrar a vivir",
    "Lavado de cara",
    "Reforma parcial",
    "Reforma integral",
  ];

  function updateForm(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleExitOption(option) {
    setForm((p) => {
      const exists = (p.exit_options || []).includes(option);
      return {
        ...p,
        exit_options: exists
          ? p.exit_options.filter((x) => x !== option)
          : [...(p.exit_options || []), option],
      };
    });
  }

  async function saveChanges() {
    if (!listing?.id) {
      alert("No se ha encontrado el anuncio.");
      return;
    }

    const payload = {
      title: form.title,
      type: form.type,
      operation: form.operation,
      province: form.province,
      city: form.city,
      location: form.location,
      hide_address: form.hide_address,
      price: form.price,
      estimated_sale_m2: form.estimated_sale_m2,
      m2_housing: form.m2_housing,
      m2_plot: form.m2_plot,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      units: form.units,
      legal_status: form.legal_status,
      property_status: form.property_status,
      exit_options: form.exit_options || [],
      description: form.description,
      status: form.status,
      media: form.media || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listing.id);

    if (error) {
      alert("Error actualizando anuncio: " + error.message);
      return;
    }

    alert("Anuncio actualizado correctamente");
    setPage("myListings");
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setPage("myListings")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
      >
        ← Volver a mis anuncios
      </button>

      <Panel title="Datos básicos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label>Tipo de inmueble</label>
            <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}>
              {propertyTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label>Operación</label>
            <select value={form.operation} onChange={(e) => updateForm("operation", e.target.value)}>
              {operations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <ProvinceSelect value={form.province} onChange={(e) => updateForm("province", e.target.value)} />

          <Field label="Municipio" placeholder={form.city || "Valencia"} onChange={(e) => updateForm("city", e.target.value)} />
          <Field label="Dirección / ubicación" placeholder={form.location || "Calle, número..."} onChange={(e) => updateForm("location", e.target.value)} />

          <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.hide_address}
              onChange={(e) => updateForm("hide_address", e.target.checked)}
              style={{ width: "18px" }}
            />
            Ocultar dirección exacta al público
          </label>

          <Field label="Título del anuncio" placeholder={form.title || "Título"} onChange={(e) => updateForm("title", e.target.value)} />
          <Field label="Precio" placeholder={form.price || "120.000 €"} onChange={(e) => updateForm("price", e.target.value)} />
          <Field label="Venta estimada €/m² zona" placeholder={form.estimated_sale_m2 || "3.200"} onChange={(e) => updateForm("estimated_sale_m2", e.target.value)} />
        </div>
      </Panel>

      <Panel title="Características del inmueble">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="M2 vivienda" placeholder={form.m2_housing || "85"} onChange={(e) => updateForm("m2_housing", e.target.value)} />
          <Field label="M2 parcela" placeholder={form.m2_plot || "120"} onChange={(e) => updateForm("m2_plot", e.target.value)} />
          <Field label="Unidades" placeholder={form.units || "1"} onChange={(e) => updateForm("units", e.target.value)} />
          <Field label="Habitaciones" placeholder={form.bedrooms || "3"} onChange={(e) => updateForm("bedrooms", e.target.value)} />
          <Field label="Baños" placeholder={form.bathrooms || "2"} onChange={(e) => updateForm("bathrooms", e.target.value)} />

          <div>
            <label>Estado del inmueble</label>
            <select value={form.property_status} onChange={(e) => updateForm("property_status", e.target.value)}>
              {propertyStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label>Estado legal</label>
            <select value={form.legal_status} onChange={(e) => updateForm("legal_status", e.target.value)}>
              {legalStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label>Estado del anuncio</label>
            <select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
              <option>Activo</option>
              <option>Pausado</option>
              <option>Vendido</option>
              <option>Alquilado</option>
            </select>
          </div>
        </div>
      </Panel>

      <Panel title="Opciones de salida">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {["Venta directa", "Alquiler", "Buscar inversor", "Permuta"].map((item) => {
            const active = (form.exit_options || []).includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleExitOption(item)}
                className={`rounded-xl border px-4 py-4 font-semibold ${
                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                {active ? "✓ " : ""}
                {item}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Descripción">
        <textarea
          rows="6"
          placeholder="Describe el inmueble..."
          value={form.description}
          onChange={(e) => updateForm("description", e.target.value)}
        />
      </Panel>

      <Panel title="Fotos y vídeos">
        {form.media && form.media.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {form.media.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-2">
                {item.type === "image" ? (
                  <img src={item.url} alt={item.name} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "14px" }} />
                ) : (
                  <video src={item.url} controls style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "14px" }} />
                )}

                <button
                  onClick={() => updateForm("media", (form.media || []).filter((m) => m.id !== item.id))}
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm font-bold text-red-500"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Este anuncio no tiene imágenes ni vídeos todavía.</p>
        )}

        <div className="mt-6">
          <label>Añadir nuevas fotos o vídeos</label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              const uploadedMedia = [];

              for (const file of files) {
                const filePath = `${Date.now()}-${file.name}`;

                const { error } = await supabase.storage
                  .from("listing-media")
                  .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type,
                  });

                if (error) {
                  alert("Error subiendo archivo: " + error.message);
                  return;
                }

                const { data } = supabase.storage
                  .from("listing-media")
                  .getPublicUrl(filePath);

                uploadedMedia.push({
                  id: Date.now() + Math.random(),
                  name: file.name,
                  type: file.type.startsWith("video") ? "video" : "image",
                  url: data.publicUrl,
                });
              }

              updateForm("media", [...(form.media || []), ...uploadedMedia]);
            }}
          />
        </div>
      </Panel>

      <button
        onClick={saveChanges}
        className="w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white shadow-sm"
      >
        Guardar cambios
      </button>
    </div>
  );
}
function SettingsPage({ setPage }) {
  const [settings, setSettings] = useState({
    country: "España",
    province: "Valencia",
    language: "Español",
    appearance: "Claro",
    email_notifications: true,
    opportunity_alerts: true,
    chat_notifications: true,
    privacy_visibility: "Perfil privado",
  });

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings(data);
      }
    }

    loadSettings();
  }, []);

  async function saveSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    const payload = {
      user_id: user.id,
      ...settings,
    };

   const { error } = await supabase
  .from("user_settings")
  .upsert(payload, { onConflict: "user_id" });

    if (error) {
     alert("Error guardando ajustes: " + error.message);
      return;
    }

    alert("Ajustes guardados correctamente");
    setPage("profile");
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setPage("profile")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700"
      >
        ← Volver a mi cuenta
      </button>

      <Panel title="Ajustes de cuenta">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label>País de búsqueda</label>
            <select
              value={settings.country}
              onChange={(e) =>
                setSettings((p) => ({ ...p, country: e.target.value }))
              }
            >
              <option>España</option>
              <option>Portugal</option>
              <option>Francia</option>
              <option>Italia</option>
            </select>
          </div>

          <ProvinceSelect
            value={settings.province}
            onChange={(e) =>
              setSettings((p) => ({ ...p, province: e.target.value }))
            }
          />

          <div>
            <label>Idioma</label>
            <select
              value={settings.language}
              onChange={(e) =>
                setSettings((p) => ({ ...p, language: e.target.value }))
              }
            >
              <option>Español</option>
              <option>Inglés</option>
              <option>Francés</option>
              <option>Portugués</option>
            </select>
          </div>

          <div>
            <label>Apariencia</label>
            <select
              value={settings.appearance}
              onChange={(e) =>
                setSettings((p) => ({ ...p, appearance: e.target.value }))
              }
            >
              <option>Claro</option>
              <option>Oscuro</option>
              <option>Automático</option>
            </select>
          </div>

          <div>
            <label>Privacidad del perfil</label>
            <select
              value={settings.privacy_visibility}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  privacy_visibility: e.target.value,
                }))
              }
            >
              <option>Perfil privado</option>
              <option>Visible para anunciantes</option>
              <option>Visible para inversores</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                email_notifications: e.target.checked 
                }))
              }
            />
            Recibir notificaciones por email
          </label>

          <label style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={settings.opportunity_alerts}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  opportunity_alerts: e.target.checked,
                }))
              }
            />
            Recibir alertas de nuevas oportunidades
          </label>

          <label style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={settings.chat_notifications}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  chat_notifications: e.target.checked,
                }))
              }
            />
            Recibir avisos de nuevos mensajes
          </label>
        </div>

        <button
          onClick={saveSettings}
          className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white"
        >
          Guardar ajustes
        </button>
      </Panel>
    </div>
  );
}
function MobileNav({ page, setPage }) {
  const items = [
    ["home", "Inicio"],
    ["favorites", "Favoritos"],
    ["chat", "Chat"],
    ["panel", "Panel"],
    ["publish", "Publicar"],
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-2 px-3 py-3 text-center text-[11px] text-slate-600">
        {items.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`rounded-2xl px-2 py-2 ${
              page === key
                ? "bg-emerald-500 text-white font-bold"
                : "bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
