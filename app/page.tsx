/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import {
  getCities,
  getDistricts,
  registerCompany,
  loginCompany,
  addTowTruck,
  updateTowTruck,
  listTowTrucks,
  deactivateTowTruck,
  activateTowTruck,
  deleteTowTruck,
  findNearestCompanies,
  type City,
  type District,
  type AuthResponseDto,
  type TowTruck,
  type CompanyDto,
} from "@/lib/api";
import Image from "next/image";
import logo from "./logo.png";

const TOKEN_KEY = "yd-auth-token";
const USER_KEY = "yd-user";
const PROFILE_KEY = "yd-profile";
const TOW_LOC_KEY = "yd-tow-loc";

export default function Home() {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [provinceId, setProvinceId] = useState<string>("6"); // Ankara provinceId
  const [districtId, setDistrictId] = useState<string>("");
  const [registering, setRegistering] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showTowModal, setShowTowModal] = useState<boolean>(false);
  const [showTowList, setShowTowList] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>("");
  const [user, setUser] = useState<
    | {
        name: string;
        company?: string;
        photoUrl?: string;
        email?: string;
        phoneNumber?: string;
        serviceCity?: string;
        fullAddress?: string;
      }
    | null
  >(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    phoneNumber: "",
    fullAddress: "",
    serviceCity: "",
    email: "",
    password: "",
  });
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    phoneNumber: "",
    serviceCity: "",
    fullAddress: "",
    email: "",
  });
  const [towForm, setTowForm] = useState({ name: "", plate: "", notes: "" });
  const [towList, setTowList] = useState<
    {
      id: number;
      name: string;
      plate: string;
      location?: string;
      isActive?: boolean;
      areaProvinceId?: number;
      areaDistrictId?: number;
      areaCity?: string;
      areaDistrict?: string;
    }[]
  >([]);
  const [towLoading, setTowLoading] = useState<boolean>(false);
  const [editingTowId, setEditingTowId] = useState<number | null>(null);
  const [editingTowForm, setEditingTowForm] = useState({
    name: "",
    plate: "",
    provinceId: "",
    districtId: "",
    cityName: "",
    districtName: "",
  });
  const [editingDistricts, setEditingDistricts] = useState<District[]>([]);
  const districtNameCache = useRef<Record<number, string>>({});
  const towLocCache = useRef<Record<number, { city?: string; district?: string }>>({});
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  useEffect(() => {
    getCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      const savedTowLoc = localStorage.getItem(TOW_LOC_KEY);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      }
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfileForm(parsedProfile);
      }
      if (savedToken) {
        setAuthToken(savedToken);
      }
      if (savedTowLoc) {
        towLocCache.current = JSON.parse(savedTowLoc);
      }
    } catch {
      // ignore parse errors and continue with a fresh session
    }
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    getDistricts(Number(provinceId))
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [provinceId]);

  useEffect(() => {
    const loadCompanies = async () => {
      if (!provinceId && !districtId) {
        setCompanies([]);
        return;
      }
      setCompaniesLoading(true);
      try {
        const res = await findNearestCompanies({
          provinceId: provinceId ? Number(provinceId) : undefined,
          districtId: districtId ? Number(districtId) : undefined,
          limit: 20,
        });
        setCompanies(res || []);
      } catch {
        setCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, [provinceId, districtId]);

  const uniqueProvinces = useMemo(() => {
    const map = new Map<number, string>();
    cities.forEach((city) => {
      if (!map.has(city.provinceId) && city.cityName) {
        map.set(city.provinceId, city.cityName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [cities]);

  const selectedProvinceName = useMemo(() => {
    const found = uniqueProvinces.find((p) => String(p.id) === provinceId);
    return found?.name || "Ankara";
  }, [provinceId, uniqueProvinces]);

  const selectedDistrictName = useMemo(() => {
    const found = districts.find((d) => String(d.districtId) === districtId);
    return found?.districtName || "";
  }, [districtId, districts]);

  const query = [selectedDistrictName, selectedProvinceName || "Ankara", "Türkiye"]
    .filter(Boolean)
    .join(" ");

  const zoom = districtId ? 13 : 11;
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    query || "Türkiye"
  )}&output=embed&z=${zoom}&hl=tr&scrollwheel=1`;

  useEffect(() => {
    if (authToken) {
      loadTowList(authToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const persistSession = (
    tokenValue: string,
    userData: Exclude<typeof user, null>,
    profileData: typeof profileForm
  ) => {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
    localStorage.setItem(TOW_LOC_KEY, JSON.stringify(towLocCache.current));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(TOW_LOC_KEY);
  };

  const handleAvatar = (res?: AuthResponseDto) => {
    const name = res?.company?.companyName || res?.company?.city || "";
    const first = res?.company?.firstName || registerForm.firstName || profileForm.firstName;
    const last = res?.company?.lastName || registerForm.lastName || profileForm.lastName;
    const companyName =
      res?.company?.companyName || registerForm.companyName || profileForm.companyName;
    const phone = res?.company?.phoneNumber || registerForm.phoneNumber || profileForm.phoneNumber;
    const serviceCity =
      res?.company?.serviceCity || registerForm.serviceCity || profileForm.serviceCity;
    const fullAddress =
      res?.company?.fullAddress || registerForm.fullAddress || profileForm.fullAddress;
    const email =
      res?.company?.email || registerForm.email || loginForm.email || profileForm.email;
    const display =
      companyName ||
      name ||
      [first, last]
        .filter(Boolean)
        .join(" ")
        .trim();
    const nextUser = {
      name: display || "Kullanıcı",
      company: companyName,
      photoUrl: photoPreview || undefined,
      email,
      phoneNumber: phone,
      serviceCity,
      fullAddress,
    };
    const nextProfile = {
      firstName: first || "",
      lastName: last || "",
      companyName: companyName || "",
      phoneNumber: phone || "",
      serviceCity: serviceCity || "",
      fullAddress: fullAddress || "",
      email: email || "",
    };
    setUser(nextUser);
    setProfileForm(nextProfile);
    return { nextUser, nextProfile };
  };
  
  const loadTowList = async (tokenValue?: string) => {
    const activeToken = tokenValue || authToken;
    if (!activeToken) return;
    setTowLoading(true);
    try {
      const data = await listTowTrucks(activeToken);
      console.log("tow api response", JSON.stringify(data, null, 2));
      const provincesToFetch = new Set<number>();
      (data || []).forEach((tow) => {
        const area = (tow as any).operatingAreas?.[0];
        const districtId = area?.districtId;
        if (
          districtId !== undefined &&
          districtId !== null &&
          !area?.district &&
          !districtNameCache.current[districtId] &&
          area?.provinceId
        ) {
          provincesToFetch.add(area.provinceId);
        }
      });

      for (const provId of provincesToFetch) {
        try {
          const fetched = await getDistricts(provId);
          fetched.forEach((d) => {
            districtNameCache.current[d.districtId] = d.districtName || "";
          });
        } catch {
          // ignore
        }
      }

      setTowList(
        (data || []).map((tow) => {
          const area = (tow as any).operatingAreas?.[0];
          const savedLoc = tow.id ? towLocCache.current[tow.id] : undefined;
          const districtIdVal = area?.districtId ?? undefined;
          const districtFromState =
            districtIdVal !== undefined
              ? districts.find((d) => d.districtId === districtIdVal)?.districtName || ""
              : "";
          const provinceName =
            uniqueProvinces.find((p) => p.id === area?.provinceId)?.name ||
            savedLoc?.city ||
            area?.city ||
            (area?.provinceId && area.provinceId !== 0 ? `İl #${area.provinceId}` : "") ||
            selectedProvinceName;
          const cachedDistrict =
            (area?.districtId ?? null) !== null && (area?.districtId ?? undefined) !== undefined
              ? districtNameCache.current[area.districtId] || ""
              : "";
          const districtName =
            area?.district ||
            cachedDistrict ||
            districtFromState ||
            savedLoc?.district ||
            (area?.districtId && area.districtId !== 0 ? `İlce #${area.districtId}` : "") ||
            selectedDistrictName;
          const locationFromArea = [districtName, provinceName].filter(Boolean).join(", ");
          const locationFallback = [selectedDistrictName, selectedProvinceName]
            .filter(Boolean)
            .join(", ");
          const location = locationFromArea || locationFallback || "";
          if (tow.id) {
            towLocCache.current[tow.id] = {
              city: provinceName || savedLoc?.city,
              district: districtName || savedLoc?.district,
            };
          }
          return {
            id: tow.id || Date.now(),
            name: tow.driverName || "Çekici",
            plate: tow.licensePlate || "",
            location: location || undefined,
            isActive: tow.isActive,
            areaProvinceId: area?.provinceId ?? (provinceId ? Number(provinceId) : undefined),
            areaDistrictId: area?.districtId ?? districtIdVal,
            areaCity: area?.city || undefined,
            areaDistrict: area?.district || cachedDistrict || districtFromState || undefined,
          };
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Çekici listesi alinamadi";
      setToast(message);
    } finally {
      setTowLoading(false);
    }
  };

  const handleRegister = async () => {
    setToast("");
    if (!provinceId || !districtId) {
      setToast("Lütfen il ve ilçe seçiniz.");
      return;
    }
    setRegistering(true);
    try {
      const payload = {
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        companyName: registerForm.companyName,
        phoneNumber: registerForm.phoneNumber,
        provinceId: Number(provinceId),
        districtId: Number(districtId),
        fullAddress: registerForm.fullAddress,
        serviceCity: registerForm.serviceCity || selectedProvinceName,
        email: registerForm.email,
        password: registerForm.password,
        city: selectedProvinceName,
        district: selectedDistrictName,
      };
      const res = await registerCompany(payload);
      const { nextUser, nextProfile } = handleAvatar(res);
      if (res?.token) {
        setAuthToken(res.token);
        persistSession(res.token, nextUser, nextProfile);
        loadTowList(res.token);
      }
      setToast("Kayıt başarılı, hoş geldiniz!");
      setShowRegister(false);
    } catch {
      setToast("Kayıt başarısız, bilgileri kontrol ediniz");
    } finally {
      setRegistering(false);
    }
  };

  const handleLogin = async () => {
    setToast("");
    setRegistering(true);
    try {
      const res = await loginCompany({
        email: loginForm.email,
        password: loginForm.password,
      });
      const { nextUser, nextProfile } = handleAvatar(res);
      if (res?.token) {
        setAuthToken(res.token);
        persistSession(res.token, nextUser, nextProfile);
        loadTowList(res.token);
      }
      setToast("Giriş başarılı, hoş geldiniz!");
      setShowLogin(false);
    } catch {
      setToast("Giriş başarısız, bilgilerinizi kontrol ediniz");
    } finally {
      setRegistering(false);
    }
  };

  const toggleProfileMenu = () => setShowProfileMenu((p) => !p);

  const openProfile = () => {
    if (!user) return;
    setProfileForm({
      firstName: profileForm.firstName || "",
      lastName: profileForm.lastName || "",
      companyName: user.company || profileForm.companyName,
      phoneNumber: user.phoneNumber || profileForm.phoneNumber,
      serviceCity: user.serviceCity || profileForm.serviceCity,
      fullAddress: user.fullAddress || profileForm.fullAddress,
      email: user.email || profileForm.email,
    });
    setShowProfileMenu(false);
    setShowProfileModal(true);
  };

  const handleLogout = () => {
    setUser(null);
    clearSession();
    setAuthToken("");
    setTowList([]);
    setShowProfileMenu(false);
    setShowProfileModal(false);
    setToast("Çıkış yapıldı");
  };
  const handleProfileSave = () => {
    const displayName =
      profileForm.companyName ||
      [profileForm.firstName, profileForm.lastName].filter(Boolean).join(" ").trim() ||
      "Kullanıcı";
    const updatedUser = {
      name: displayName,
      company: profileForm.companyName || user?.company,
      photoUrl: user?.photoUrl,
      email: profileForm.email || user?.email,
      phoneNumber: profileForm.phoneNumber || user?.phoneNumber,
      serviceCity: profileForm.serviceCity || user?.serviceCity,
      fullAddress: profileForm.fullAddress || user?.fullAddress,
    };
    setUser(updatedUser);
    if (authToken) {
      persistSession(authToken, updatedUser, profileForm);
    }
    setShowProfileModal(false);
    setToast("Profiliniz güncellendi");
  };

  const openTowList = () => {
    setShowProfileMenu(false);
    if (!towList.length) {
      loadTowList();
    }
    setShowTowList(true);
  };

  const openTowModal = () => {
    setShowProfileMenu(false);
    setShowTowList(false); // modal �stte olsun diye listeyi kapat
    setShowTowModal(true);
  };

  const handleTowSave = async () => {
    if (!authToken) {
      setToast("Çekici eklemek için önce giris yapınız.");
      setShowLogin(true);
      return;
    }
    if (!provinceId || !districtId) {
      setToast("Lütfen çekici için il ve ilçe seçiniz.");
      return;
    }
    if (!towForm.name || !towForm.plate) {
      setToast("Çekici adı ve plaka giriniz");
      return;
    }
    setTowLoading(true);
    try {
      const newTow = await addTowTruck(authToken, {
        licensePlate: towForm.plate,
        driverName: towForm.name,
        areas: [
          {
            provinceId: Number(provinceId),
            districtId: Number(districtId),
            city: selectedProvinceName || undefined,
            district: selectedDistrictName || undefined,
          },
        ],
      });
      setTowList((list) => [
        ...list,
        {
          id: newTow.id || Date.now(),
          name: newTow.driverName || towForm.name,
          plate: newTow.licensePlate || towForm.plate,
          location: [selectedDistrictName, selectedProvinceName].filter(Boolean).join(", "),
          areaProvinceId: Number(provinceId),
          areaDistrictId: Number(districtId),
          areaCity: selectedProvinceName,
          areaDistrict: selectedDistrictName,
          isActive: newTow.isActive,
        },
      ]);
      if (newTow.id) {
        towLocCache.current[newTow.id] = {
          city: selectedProvinceName,
          district: selectedDistrictName,
        };
        localStorage.setItem(TOW_LOC_KEY, JSON.stringify(towLocCache.current));
      }
      setTowForm({ name: "", plate: "", notes: "" });
      setShowTowModal(false);
      setShowTowList(true);
      setToast("Çekici eklendi");
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes("failed to fetch")) {
        setToast("Çekici eklenemedi: API'ye ulasilamadi (CORS ya da 500 hatasi).");
      } else {
        const message = err instanceof Error ? err.message : "Çekici eklenemedi";
        setToast(message);
      }
    } finally {
      setTowLoading(false);
    }
  };
  const handleTowUpdate = (id: number, field: "name" | "plate" | "notes", value: string) => {
    setTowList((list) =>
      list.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleTowToggleActive = async (id: number) => {
    if (!authToken) {
      setToast("Önce giriş yapınız.");
      return;
    }
    const current = towList.find((t) => t.id === id);
    if (!current) return;
    try {
      if (current.isActive) {
        await deactivateTowTruck(authToken, id);
        setTowList((list) =>
          list.map((item) => (item.id === id ? { ...item, isActive: false } : item))
        );
        setToast("Çekici pasiflestirildi");
      } else {
        await activateTowTruck(authToken, id);
        setTowList((list) =>
          list.map((item) => (item.id === id ? { ...item, isActive: true } : item))
        );
        setToast("Çekici aktiflestirildi");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Durum güncellenemedi";
      setToast(message);
    }
  };

  const startTowEdit = (id: number) => {
    const current = towList.find((t) => t.id === id);
    if (!current) return;
    setEditingTowId(id);
    const districtNameFromState =
      current.areaDistrictId !== undefined && current.areaDistrictId !== null
        ? districts.find((d) => d.districtId === current.areaDistrictId)?.districtName || ""
        : "";
    setEditingTowForm({
      name: current.name || "",
      plate: current.plate || "",
      provinceId: String(current.areaProvinceId || provinceId || ""),
      districtId: current.areaDistrictId ? String(current.areaDistrictId) : "",
      cityName: current.areaCity || selectedProvinceName || "",
      districtName:
        current.areaDistrict ||
        (current.areaDistrictId ? districtNameCache.current[current.areaDistrictId] : "") ||
        districtNameFromState ||
        selectedDistrictName ||
        "",
    });
    const provToLoad =
      current.areaProvinceId ||
      (editingTowForm.provinceId ? Number(editingTowForm.provinceId) : null) ||
      (provinceId ? Number(provinceId) : null);
    if (provToLoad) {
      getDistricts(provToLoad)
        .then(setEditingDistricts)
        .catch(() => setEditingDistricts([]));
    } else {
      setEditingDistricts(districts);
    }
  };

  const cancelTowEdit = () => {
    setEditingTowId(null);
    setEditingTowForm({ name: "", plate: "", provinceId: "", districtId: "", cityName: "", districtName: "" });
    setEditingDistricts([]);
  };

  const handleTowEditSave = async (id: number) => {
    if (!authToken) {
      setToast("Önce giriş yapınız.");
      return;
    }
    const current = towList.find((t) => t.id === id);
    if (!current) return;
    try {
      const provinceName =
        uniqueProvinces.find((p) => String(p.id) === editingTowForm.provinceId)?.name ||
        current.areaCity;
      const districtName =
        editingDistricts.find((d) => String(d.districtId) === editingTowForm.districtId)
          ?.districtName ||
        (editingTowForm.districtId
          ? districtNameCache.current[Number(editingTowForm.districtId)]
          : "") ||
        current.areaDistrict ||
        (current.areaDistrictId ? `İlce #${current.areaDistrictId}` : "");
      const updated = await updateTowTruck(authToken, id, {
        driverName: editingTowForm.name,
        licensePlate: editingTowForm.plate,
        isActive: current.isActive,
        areas:
          editingTowForm.provinceId && editingTowForm.districtId
            ? [
                {
                  provinceId: Number(editingTowForm.provinceId),
                  districtId: Number(editingTowForm.districtId),
                  city: provinceName || undefined,
                  district: districtName || undefined,
                },
              ]
            : current.areaProvinceId && current.areaDistrictId
              ? [
                  {
                    provinceId: current.areaProvinceId,
                    districtId: current.areaDistrictId,
                    city: current.areaCity || provinceName,
                    district: current.areaDistrict || districtName,
                  },
                ]
              : undefined,
      });
      const area = (updated as any).operatingAreas?.[0];
      const location = [area?.district, area?.city].filter(Boolean).join(", ");
      if (updated.id) {
        towLocCache.current[updated.id] = {
          city: area?.city || provinceName || current.areaCity,
          district: area?.district || districtName || current.areaDistrict,
        };
        localStorage.setItem(TOW_LOC_KEY, JSON.stringify(towLocCache.current));
      }
      setTowList((list) =>
        list.map((item) =>
          item.id === id
            ? {
                ...item,
                name: updated.driverName || editingTowForm.name,
                plate: updated.licensePlate || editingTowForm.plate,
                location: location || item.location,
                areaProvinceId: area?.provinceId ?? item.areaProvinceId,
                areaDistrictId: area?.districtId ?? item.areaDistrictId,
                areaCity: area?.city ?? item.areaCity,
                areaDistrict: area?.district ?? item.areaDistrict,
                isActive: updated.isActive,
              }
            : item
        )
      );
      setEditingTowId(null);
      setEditingTowForm({ name: "", plate: "" });
      setToast("Çekici güncellendi");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Güncelleme başarısız";
      setToast(message);
    }
  };

  const handleTowDelete = async (id: number) => {
    if (!authToken) {
      setToast("Önce giriş yapınız.");
      return;
    }
    try {
      await deleteTowTruck(authToken, id);
      setTowList((list) => list.filter((item) => item.id !== id));
      setToast("Çekici silindi");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Silme basarisiz";
      setToast(`Silme hatası: ${message}`);
    }
  };
  const initials = useMemo(() => {
    if (!user?.name) return "K";
    const parts = user.name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts[1]?.[0] || "";
    return (first + last || first || "K").toUpperCase();
  }, [user]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image src={logo} alt="Yoldan Çek" className={styles.logoImage} priority />
      </header>

      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <div className={styles.topRight}>
        {user ? (
          <div className={styles.userArea}>
            <button type="button" className={styles.secondary} onClick={openTowModal}>
              Çekici ekle
            </button>
            <button type="button" className={styles.userBadgeButton} onClick={toggleProfileMenu}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
              )}
              <div>
                <div className={styles.userName}>{user.name}</div>
                {user.company ? <div className={styles.userMeta}>{user.company}</div> : null}
              </div>
              <span className={styles.caret}>¡</span>
            </button>
            {showProfileMenu ? (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} type="button" onClick={openTowList}>
                  Çekicilerim
                </button>
                <button className={styles.dropdownItem} type="button" onClick={openProfile}>
                  Profilim
                </button>
                <button className={styles.dropdownItem} type="button" onClick={handleLogout}>
                  Çıkış
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={() => setShowLogin(true)}>
              Giriş yap
            </button>
            <button className={styles.primary} type="button" onClick={() => setShowRegister(true)}>
              Kayıt ol
            </button>
          </div>
        )}
      </div>

                  <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>Konum Seç</div>
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>İl</span>
            <select
              className={styles.select}
              value={provinceId}
              onChange={(e) => {
                const val = e.target.value;
                setProvinceId(val);
                setDistrictId("");
                setDistricts([]);
              }}
            >
              <option value="">İl seçin</option>
              {uniqueProvinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>İlçe</span>
            <select
              className={styles.select}
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              disabled={!provinceId}
            >
              <option value="">İlçe seçin</option>
              {districts.map((d) => (
                <option key={d.districtId} value={d.districtId}>
                  {d.districtName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.mapWrap}>
          <iframe
            key={mapUrl}
            className={styles.map}
            src={mapUrl}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Harita"
          />
        <div className={styles.mapBadge}>
          {selectedDistrictName || "�l�e se�"} � {selectedProvinceName || "�l se�"}
        </div>
      </div>
    </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>Online �ekiciler</div>
        </div>
        {companiesLoading ? (
          <div className={styles.smallMuted}>�ekiciler y�kleniyor...</div>
        ) : companies.length === 0 ? (
          <div className={styles.smallMuted}>Hen�z listelenecek �ekici yok.</div>
        ) : (
          <div className={styles.formGrid}>
            {companies.map((c, idx) => (
              <div key={`${c.id || idx}-${c.licensePlate || c.companyName || "cmp"}`} className={styles.field}>
                <div className={styles.fieldRow}>
                  <span>{c.companyName || c.city || "�ekici"}</span>
                  <span className={styles.smallMuted}>{c.distance ? `${c.distance} km` : "Online"}</span>
                </div>
                <div className={styles.smallMuted}>Plaka: {c.email || "-"}</div>
                <div className={styles.smallMuted}>
                  Il/Ilce: {[c.district, c.city].filter(Boolean).join(", ") || "Belirtilmedi"}
                </div>
                <div className={styles.smallMuted}>Telefon: {c.phoneNumber || "-"}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>Online �ekiciler</div>
        </div>
        {towLoading ? (
          <div className={styles.smallMuted}>�ekiciler y�kleniyor...</div>
        ) : towList.length === 0 ? (
          <div className={styles.smallMuted}>Hen�z listelenecek �ekici yok.</div>
        ) : (
          <div className={styles.formGrid}>
            {towList.map((item) => (
              <div key={item.id} className={styles.field}>
                <div className={styles.fieldRow}>
                  <span>{item.name || "�ekici"}</span>
                  <span className={styles.smallMuted}>{item.isActive ? "Aktif" : "Pasif"}</span>
                </div>
                <div className={styles.smallMuted}>Plaka: {item.plate || "-"}</div>
                <div className={styles.smallMuted}>
                  Il/Ilce: {[item.areaDistrict || selectedDistrictName, item.areaCity || selectedProvinceName].filter(Boolean).join(", ") || item.location || "Belirtilmedi"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>\n
      {showTowModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Çekici ekle</div>
              </div>
              <button className={styles.secondary} type="button" onClick={() => setShowTowModal(false)}>
                Kapat
              </button>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>İl</span>
                <select
                  className={styles.select}
                  value={provinceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProvinceId(val);
                    setDistrictId("");
                    setDistricts([]);
                  }}
                >
                  <option value="">İl seçin</option>
                  {uniqueProvinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>İlçe</span>
                <select
                  className={styles.select}
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  disabled={!provinceId}
                >
                  <option value="">İlçe seçin</option>
                  {districts.map((d) => (
                    <option key={d.districtId} value={d.districtId}>
                      {d.districtName}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Ad</span>
                <input
                  className={styles.input}
                  value={towForm.name}
                  onChange={(e) => setTowForm({ ...towForm, name: e.target.value })}
                  placeholder="Çekici adı"
                />
              </label>
              <label className={styles.field}>
                <span>Plaka</span>
                <input
                  className={styles.input}
                  value={towForm.plate}
                  onChange={(e) => setTowForm({ ...towForm, plate: e.target.value })}
                  placeholder="34 ABC 123"
                />
              </label>
              <label className={styles.field}>
                <span>Not</span>
                <textarea
                  className={styles.textarea}
                  value={towForm.notes}
                  onChange={(e) => setTowForm({ ...towForm, notes: e.target.value })}
                  placeholder="Opsiyonel not"
                />
              </label>
            </div>
            <div className={styles.buttonRow}>
              <button className={styles.primary} onClick={handleTowSave} disabled={towLoading}>
                {towLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTowList ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Çekicilerim</div>
              </div>
              <div className={styles.actions}>
                <button className={styles.secondary} type="button" onClick={openTowModal}>
                  Yeni çekici
                </button>
                <button className={styles.secondary} type="button" onClick={() => setShowTowList(false)}>
                  Kapat
                </button>
              </div>
            </div>
            {towLoading ? (
              <div className={styles.smallMuted}>Çekiciler yükleniyor...</div>
            ) : towList.length === 0 ? (
              <div className={styles.smallMuted}>Henüz eklenmiş çekici yok.</div>
            ) : (
              <div className={styles.formGrid}>
                {towList.map((item) => (
                  <div key={item.id} className={styles.field}>
                    <div className={styles.fieldRow}>
                      <span>{item.name || "Çekici"}</span>
                      <span className={styles.smallMuted}>{item.isActive ? "Aktif" : "Pasif"}</span>
                    </div>
                    <div className={styles.smallMuted}>Plaka: {item.plate || "-"}</div>
                    <div className={styles.smallMuted}>
                      Durum: {item.isActive ? "Aktif" : "Pasif"}
                    </div>
                    <div className={styles.smallMuted}>
                      Il/Ilce:{" "}
                      {[item.areaDistrict || selectedDistrictName, item.areaCity || selectedProvinceName]
                        .filter(Boolean)
                        .join(", ") || item.location || "Belirtilmedi"}
                    </div>
                    {editingTowId === item.id ? (
                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>Ad</span>
                          <input
                            className={styles.input}
                            value={editingTowForm.name}
                            onChange={(e) =>
                              setEditingTowForm({ ...editingTowForm, name: e.target.value })
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Plaka</span>
                          <input
                            className={styles.input}
                            value={editingTowForm.plate}
                            onChange={(e) =>
                              setEditingTowForm({ ...editingTowForm, plate: e.target.value })
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Il</span>
                          <select
                            className={styles.select}
                            value={editingTowForm.provinceId}
                            onChange={async (e) => {
                              const val = e.target.value;
                              const provName =
                                uniqueProvinces.find((p) => String(p.id) === val)?.name || "";
                              setEditingTowForm((form) => ({
                                ...form,
                                provinceId: val,
                                cityName: provName,
                                districtId: "",
                                districtName: "",
                              }));
                              setEditingDistricts([]);
                              if (val) {
                                try {
                                  const fetched = await getDistricts(Number(val));
                                  setEditingDistricts(fetched);
                                } catch {
                                  setEditingDistricts([]);
                                }
                              }
                            }}
                          >
                            <option value="">Il secin</option>
                            {uniqueProvinces.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span>Ilce</span>
                          <select
                            className={styles.select}
                            value={editingTowForm.districtId}
                            onChange={(e) =>
                              setEditingTowForm({
                                ...editingTowForm,
                                districtId: e.target.value,
                                districtName:
                                  editingDistricts.find((d) => String(d.districtId) === e.target.value)
                                    ?.districtName || "",
                              })
                            }
                            disabled={!editingTowForm.provinceId}
                          >
                            <option value="">Ilce secin</option>
                            {editingDistricts.map((d) => (
                              <option key={d.districtId} value={d.districtId}>
                                {d.districtName}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                    <div className={styles.buttonRow}>
                      {editingTowId === item.id ? (
                        <>
                          <button
                            className={styles.primary}
                            type="button"
                            onClick={() => handleTowEditSave(item.id)}
                            disabled={towLoading}
                          >
                            Kaydet
                          </button>
                          <button
                            className={styles.secondary}
                            type="button"
                            onClick={cancelTowEdit}
                            disabled={towLoading}
                          >
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={styles.secondary}
                            type="button"
                            onClick={() => handleTowToggleActive(item.id)}
                          >
                            {item.isActive ? "Pasiflestir" : "Aktiflestir"}
                          </button>
                          <button
                            className={styles.secondary}
                            type="button"
                            onClick={() => startTowEdit(item.id)}
                          >
                            Düzenle
                          </button>
                          <button
                            className={styles.secondary}
                            type="button"
                            onClick={() => handleTowDelete(item.id)}
                          >
                            Sil
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showRegister ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Kayıt Ol</div>
              </div>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setShowRegister(false)}
              >
                Kapat
              </button>
            </div>
            {toast ? <div className={styles.toast}>{toast}</div> : null}
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Ad</span>
                <input
                  className={styles.input}
                  value={registerForm.firstName}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, firstName: e.target.value })
                  }
                  placeholder="Adınız"
                />
              </label>
              <label className={styles.field}>
                <span>Soyad</span>
                <input
                  className={styles.input}
                  value={registerForm.lastName}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, lastName: e.target.value })
                  }
                  placeholder="Soyadınız"
                />
              </label>
              <label className={styles.field}>
                <span>Firma Adı</span>
                <input
                  className={styles.input}
                  value={registerForm.companyName}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, companyName: e.target.value })
                  }
                  placeholder="Örn: Mavi Oto"
                />
              </label>
              <label className={styles.field}>
                <span>Telefon</span>
                <input
                  className={styles.input}
                  value={registerForm.phoneNumber}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, phoneNumber: e.target.value })
                  }
                  placeholder="+90 5xx xxx xx xx"
                />
              </label>
              <label className={styles.field}>
                <span>E-posta</span>
                <input
                  className={styles.input}
                  type="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  placeholder="firma@ornek.com"
                />
              </label>
              <label className={styles.field}>
                <span>Şifre</span>
                <input
                  className={styles.input}
                  type="password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, password: e.target.value })
                  }
                  placeholder="Minimum 6 karakter"
                />
              </label>
              <label className={styles.field}>
                <span>Hizmet Şehri</span>
                <input
                  className={styles.input}
                  value={registerForm.serviceCity}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, serviceCity: e.target.value })
                  }
                  placeholder="İl / bölge"
                />
              </label>
              <label className={styles.field}>
                <span>Açık Adres</span>
                <textarea
                  className={styles.textarea}
                  value={registerForm.fullAddress}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, fullAddress: e.target.value })
                  }
                  placeholder="Adres"
                />
              </label>
              <label className={styles.field}>
                <span>Avatar (opsiyonel)</span>
                <input
                  className={styles.input}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const url = String(ev.target?.result || "");
                        setPhotoPreview(url);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className={styles.avatarRow}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Önizleme" className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarPlaceholderSmall}>{initials}</div>
                  )}
                  <span className={styles.smallMuted}>Opsiyonel.</span>
                </div>
              </label>
            </div>
            <div className={styles.buttonRow}>
              <button
                className={styles.primary}
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? "Kaydediliyor..." : "Kayıt ol"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLogin ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Giriş Yap</div>
              </div>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setShowLogin(false)}
              >
                Kapat
              </button>
            </div>
            {toast ? <div className={styles.toast}>{toast}</div> : null}
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>E-posta</span>
                <input
                  className={styles.input}
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="firma@ornek.com"
                />
              </label>
              <label className={styles.field}>
                <span>Şifre</span>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.input}
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    placeholder="******"
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? "Gizle" : "Göster"}
                  </button>
                </div>
              </label>
            </div>
            <div className={styles.buttonRow}>
              <button
                className={styles.primary}
                onClick={handleLogin}
                disabled={registering}
              >
                {registering ? "Giriş yapılıyor..." : "Giriş yap"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showProfileModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Profilim</div>
              </div>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setShowProfileModal(false)}
              >
                Kapat
              </button>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Ad</span>
                <input
                  className={styles.input}
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  placeholder="Adın"
                />
              </label>
              <label className={styles.field}>
                <span>Soyad</span>
                <input
                  className={styles.input}
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  placeholder="Soyadın"
                />
              </label>
              <label className={styles.field}>
                <span>Firma</span>
                <input
                  className={styles.input}
                  value={profileForm.companyName}
                  onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                  placeholder="Firma adın"
                />
              </label>
              <label className={styles.field}>
                <span>E-posta</span>
                <input
                  className={styles.input}
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="ornek@mail.com"
                />
              </label>
              <label className={styles.field}>
                <span>Telefon</span>
                <input
                  className={styles.input}
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  placeholder="5xx"
                />
              </label>
              <label className={styles.field}>
                <span>Hizmet Şehri</span>
                <input
                  className={styles.input}
                  value={profileForm.serviceCity}
                  onChange={(e) => setProfileForm({ ...profileForm, serviceCity: e.target.value })}
                  placeholder="İl"
                />
              </label>
              <label className={styles.field}>
                <span>Adres</span>
                <textarea
                  className={styles.textarea}
                  value={profileForm.fullAddress}
                  onChange={(e) => setProfileForm({ ...profileForm, fullAddress: e.target.value })}
                  placeholder="Adresin"
                />
              </label>
            </div>
            <div className={styles.buttonRow}>
              <button className={styles.primary} onClick={handleProfileSave}>
                Güncelle
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}







































