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
  findNearestTowTrucks,
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
  const [user, setUser] = useState<{
    name: string;
    company?: string;
    photoUrl?: string;
    email?: string;
    phoneNumber?: string;
    serviceCity?: string;
    fullAddress?: string;
  } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    phoneNumber: "",
    fullAddress: "",
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
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");
  const [towForm, setTowForm] = useState({ name: "", plate: "", notes: "" });
  const [towPhoto, setTowPhoto] = useState<File | null>(null);
  const [towPhotoPreview, setTowPhotoPreview] = useState<string>("");
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
      photoUrl?: string | null;
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
  const [editingTowPhoto, setEditingTowPhoto] = useState<File | null>(null);
  const [editingTowPhotoPreview, setEditingTowPhotoPreview] =
    useState<string>("");
  const [editingDistricts, setEditingDistricts] = useState<District[]>([]);
  const districtNameCache = useRef<Record<number, string>>({});
  const towLocCache = useRef<
    Record<number, { city?: string; district?: string }>
  >({});
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<
    number | string | null
  >(null);
  const [mapQueryOverride, setMapQueryOverride] = useState<string>("");
  const [geoLocation, setGeoLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedTowTruck, setSelectedTowTruck] = useState<
    | (CompanyDto & {
        licensePlate?: string | null;
        driverPhotoUrl?: string | null;
      })
    | null
  >(null);

  const normalizeText = (val?: string) =>
    (val || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

  // Türkiye plaka formatı: 34 ABC 123 veya 34 ABC 1234
  const formatLicensePlate = (value: string): string => {
    // Sadece rakam ve harf al, boşlukları kaldır
    const cleaned = value
      .replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, "")
      .toUpperCase();

    if (cleaned.length === 0) return "";

    // İlk 2 karakter rakam olmalı (il kodu)
    let formatted = cleaned.slice(0, 2);

    if (cleaned.length > 2) {
      // Sonraki 3 karakter harf olmalı
      const letters = cleaned.slice(2, 5).replace(/[0-9]/g, "");
      if (letters.length > 0) {
        formatted += " " + letters;
      }

      // Kalan karakterler rakam
      if (cleaned.length > 5) {
        const numbers = cleaned.slice(5, 9).replace(/[^0-9]/g, "");
        if (numbers.length > 0) {
          formatted += " " + numbers;
        }
      }
    }

    return formatted;
  };

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
      if (!provinceId && !districtId && !geoLocation) {
        setCompanies([]);
        return;
      }
      setCompaniesLoading(true);
      try {
        // Önce /api/location/nearest endpoint'ini dene (operatingAreas ile çekicileri getirir)
        try {
          const towTrucks = await findNearestTowTrucks({
            latitude: geoLocation?.lat,
            longitude: geoLocation?.lng,
            provinceId:
              !geoLocation && provinceId ? Number(provinceId) : undefined,
            districtId:
              !geoLocation && districtId ? Number(districtId) : undefined,
            limit: 20,
          });

          if (towTrucks && towTrucks.length > 0) {
            const companiesArray: (CompanyDto & {
              licensePlate?: string | null;
              latitude?: number;
              longitude?: number;
            })[] = [];

            const processTowTrucks = async () => {
              for (const tt of towTrucks) {
                if (!tt.isActive) continue;

                const areas = (tt as any).operatingAreas || [];

                let matchesArea = true;
                if (provinceId || districtId) {
                  matchesArea = areas.some((area: any) => {
                    const matchesProvince =
                      !provinceId || area.provinceId === Number(provinceId);
                    const matchesDistrict =
                      !districtId || area.districtId === Number(districtId);
                    return matchesProvince && matchesDistrict;
                  });
                }

                if (!matchesArea) continue;

                const matchedArea = (areas.find((area: any) => {
                  const matchesProvince =
                    !provinceId || area.provinceId === Number(provinceId);
                  const matchesDistrict =
                    !districtId || area.districtId === Number(districtId);
                  return matchesProvince && matchesDistrict;
                }) ||
                  areas[0] ||
                  {}) as any;

                const company: CompanyDto & {
                  licensePlate?: string | null;
                  latitude?: number;
                  longitude?: number;
                  driverPhotoUrl?: string | null;
                } = {
                  id: tt.id || Date.now() + Math.random(),
                  companyName:
                    (tt as any).driverName ||
                    (tt as any).licensePlate ||
                    "Çekici",
                  phoneNumber: (tt as any).companyPhone || "",
                  email: (tt as any).companyEmail || "",
                  city: matchedArea.city || undefined,
                  district: matchedArea.district || undefined,
                  serviceCity: (tt as any).companyServiceCity || undefined,
                  fullAddress: (tt as any).companyAddress || undefined,
                  distance: (tt as any).distance || undefined,
                  latitude:
                    (tt as any).latitude ||
                    (tt as any).currentLatitude ||
                    matchedArea.latitude ||
                    undefined,
                  longitude:
                    (tt as any).longitude ||
                    (tt as any).currentLongitude ||
                    matchedArea.longitude ||
                    undefined,
                  licensePlate: (tt as any).licensePlate || null,
                  driverPhotoUrl: (tt as any).driverPhotoUrl
                    ? (tt as any).driverPhotoUrl.startsWith("http")
                      ? (tt as any).driverPhotoUrl
                      : `${
                          process.env.NEXT_PUBLIC_API_BASE ||
                          "https://api.yoldancek.com"
                        }${
                          (tt as any).driverPhotoUrl.startsWith("/") ? "" : "/"
                        }${(tt as any).driverPhotoUrl}`
                    : null,
                };

                companiesArray.push(company);
              }

              setCompanies(companiesArray);
            };

            await processTowTrucks();
          } else {
            setCompanies([]);
          }
        } catch (towTruckError) {
          // Eğer /api/location/nearest yoksa, eski endpoint'i kullan
          const res = await findNearestCompanies({
            latitude: geoLocation?.lat,
            longitude: geoLocation?.lng,
            provinceId:
              !geoLocation && provinceId ? Number(provinceId) : undefined,
            districtId:
              !geoLocation && districtId ? Number(districtId) : undefined,
            limit: 20,
          });
          setCompanies(res || []);
        }
      } catch {
        setCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, [provinceId, districtId, geoLocation]);

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

  const getCompanyLocation = (company?: CompanyDto) => {
    if (!company) return "";
    return [company.district, company.city || selectedProvinceName]
      .filter(Boolean)
      .join(", ");
  };

  const mapMarkers = useMemo(() => {
    if (companies.length === 0) return "";
    const faviconUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/favicon.ico`
        : "/favicon.ico";
    const markers = companies
      .filter((c) => (c as any).latitude && (c as any).longitude)
      .map(
        (c) =>
          `icon:${encodeURIComponent(faviconUrl)}|${(c as any).latitude},${
            (c as any).longitude
          }`
      )
      .join("&markers=");
    return markers;
  }, [companies]);

  const query =
    mapQueryOverride ||
    getCompanyLocation(companies[0]) ||
    [selectedDistrictName, selectedProvinceName || "Ankara", "Turkiye"]
      .filter(Boolean)
      .join(" ");

  const zoom = mapQueryOverride ? 14 : districtId ? 13 : 11;

  // Google Maps embed API marker icon özelleştirmesini desteklemiyor
  // Bu yüzden embed API kullanmaya devam ediyoruz, marker icon'ları varsayılan olacak
  // Favicon'u marker olarak kullanmak için Google Maps JavaScript API gerekir
  let mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    query || "Turkiye"
  )}&output=embed&z=${zoom}&hl=tr&scrollwheel=1`;

  if (mapMarkers) {
    // Embed API'de marker icon özelleştirmesi desteklenmiyor
    // Sadece koordinatları ekliyoruz
    const markerCoords = companies
      .filter((c) => (c as any).latitude && (c as any).longitude)
      .map((c) => `${(c as any).latitude},${(c as any).longitude}`)
      .join("|");
    mapUrl += `&markers=${encodeURIComponent(markerCoords)}`;
  }

  useEffect(() => {
    if (authToken) {
      loadTowList(authToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = target.closest(`.${styles.dropdown}`);
      const userBadgeButton = target.closest(`.${styles.userBadgeButton}`);

      if (!dropdown && !userBadgeButton) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

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
    const first =
      res?.company?.firstName ||
      registerForm.firstName ||
      profileForm.firstName;
    const last =
      res?.company?.lastName || registerForm.lastName || profileForm.lastName;
    const companyName =
      res?.company?.companyName ||
      registerForm.companyName ||
      profileForm.companyName;
    const phone =
      res?.company?.phoneNumber ||
      registerForm.phoneNumber ||
      profileForm.phoneNumber;
    const serviceCity =
      res?.company?.serviceCity ||
      selectedProvinceName ||
      profileForm.serviceCity;
    const fullAddress =
      res?.company?.fullAddress ||
      registerForm.fullAddress ||
      profileForm.fullAddress;
    const email =
      res?.company?.email ||
      registerForm.email ||
      loginForm.email ||
      profileForm.email;
    const display =
      companyName || name || [first, last].filter(Boolean).join(" ").trim();
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

  const askGeolocation = (onSuccess: (lat: number, lng: number) => void) => {
    if (!navigator?.geolocation) {
      setToast("Tarayici konum izni desteklemiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onSuccess(latitude, longitude);
      },
      () => {
        setToast("Konum alınamadı, izin verdiğinizden emin olun.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleUseMyLocation = () => {
    askGeolocation(async (lat, lng) => {
      const q = `${lat},${lng}`;
      setMapQueryOverride(q);
      setGeoLocation({ lat, lng });

      // Reverse geocoding ile il ve ilçe bilgilerini al
      try {
        const { provinceName, districtName } = await reverseGeocode(lat, lng);
        const provId = findProvinceId(provinceName);
        if (provId) {
          setProvinceId(String(provId));
          const fetched = await getDistricts(provId);
          setDistricts(fetched);
          const distId = findDistrictId(fetched, districtName);
          if (distId) {
            setDistrictId(String(distId));
          }
          setToast("Konumdan il/ilçe alındı.");
        } else {
          setToast("Konumdan il bulunamadı, elle seçin.");
        }
      } catch {
        setToast("Konumdan il/ilçe alınamadı, elle seçin.");
      }
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "yoldan-cek/1.0" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    const addr = data?.address || {};
    const provinceName =
      addr.state || addr.province || addr.region || addr.state_district || "";
    const districtName =
      addr.town ||
      addr.city ||
      addr.county ||
      addr.suburb ||
      addr.village ||
      addr.municipality ||
      "";
    return {
      provinceName: provinceName as string,
      districtName: districtName as string,
    };
  };

  const findProvinceId = (name?: string) => {
    const target = normalizeText(name);
    if (!target) return undefined;
    const found = uniqueProvinces.find((p) => normalizeText(p.name) === target);
    return found?.id;
  };

  const findDistrictId = (province: District[], name?: string) => {
    const target = normalizeText(name);
    if (!target) return undefined;
    const found = province.find(
      (d) => normalizeText(d.districtName) === target
    );
    return found?.districtId;
  };

  const geocodeAndFillNewTow = async (lat: number, lng: number) => {
    try {
      setMapQueryOverride(`${lat},${lng}`);
      const { provinceName, districtName } = await reverseGeocode(lat, lng);
      const provId = findProvinceId(provinceName);
      if (provId) {
        setProvinceId(String(provId));
        const fetched = await getDistricts(provId);
        setDistricts(fetched);
        const distId = findDistrictId(fetched, districtName);
        if (distId) setDistrictId(String(distId));
      }
      setToast("Konumdan il/ilçe alindi, kontrol edin.");
    } catch {
      setToast("Konumdan il/ilçe alinamadi, elle secin.");
    }
  };

  const geocodeAndFillEditTow = async () => {
    if (!editingTowId) return;
    askGeolocation(async (lat, lng) => {
      try {
        const { provinceName, districtName } = await reverseGeocode(lat, lng);
        const provId = findProvinceId(provinceName);
        if (provId) {
          setEditingTowForm((f) => ({
            ...f,
            provinceId: String(provId),
            districtId: "",
          }));
          const fetched = await getDistricts(provId);
          setEditingDistricts(fetched);
          const distId = findDistrictId(fetched, districtName);
          if (distId) {
            setEditingTowForm((f) => ({
              ...f,
              provinceId: String(provId),
              districtId: String(distId),
            }));
          }
        }
        setMapQueryOverride(`${lat},${lng}`);
        setToast("Konumdan il/ilçe alindi, kontrol edin.");
      } catch {
        setToast("Konumdan il/ilçe alinamadi, elle secin.");
      }
    });
  };

  const towListDataRef = useRef<any[]>([]);

  const loadTowList = async (tokenValue?: string) => {
    const activeToken = tokenValue || authToken;
    if (!activeToken) return;
    setTowLoading(true);
    try {
      const data = await listTowTrucks(activeToken);
      towListDataRef.current = data || [];
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
              ? districts.find((d) => d.districtId === districtIdVal)
                  ?.districtName || ""
              : "";
          const provinceName =
            uniqueProvinces.find((p) => p.id === area?.provinceId)?.name ||
            savedLoc?.city ||
            area?.city ||
            (area?.provinceId && area.provinceId !== 0
              ? `İl #${area.provinceId}`
              : "") ||
            selectedProvinceName;
          const cachedDistrict =
            (area?.districtId ?? null) !== null &&
            (area?.districtId ?? undefined) !== undefined
              ? districtNameCache.current[area.districtId] || ""
              : "";
          const districtName =
            area?.district ||
            cachedDistrict ||
            districtFromState ||
            savedLoc?.district ||
            (area?.districtId && area.districtId !== 0
              ? `İlce #${area.districtId}`
              : "") ||
            selectedDistrictName;
          const locationFromArea = [districtName, provinceName]
            .filter(Boolean)
            .join(", ");
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
            areaProvinceId:
              area?.provinceId ?? (provinceId ? Number(provinceId) : undefined),
            areaDistrictId: area?.districtId ?? districtIdVal,
            areaCity: area?.city || undefined,
            areaDistrict:
              area?.district ||
              cachedDistrict ||
              districtFromState ||
              undefined,
            photoUrl: (tow as any).driverPhotoUrl
              ? (tow as any).driverPhotoUrl.startsWith("http")
                ? (tow as any).driverPhotoUrl
                : `${
                    process.env.NEXT_PUBLIC_API_BASE ||
                    "https://api.yoldancek.com"
                  }${(tow as any).driverPhotoUrl.startsWith("/") ? "" : "/"}${
                    (tow as any).driverPhotoUrl
                  }`
              : null,
          };
        })
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Çekici listesi alinamadi";
      setToast(message);
    } finally {
      setTowLoading(false);
    }
  };

  const handleRegister = async () => {
    setToast("");
    
    // Tüm zorunlu alanları kontrol et
    if (!registerForm.firstName?.trim()) {
      setToast("Lütfen adınızı giriniz.");
      return;
    }
    if (!registerForm.lastName?.trim()) {
      setToast("Lütfen soyadınızı giriniz.");
      return;
    }
    if (!registerForm.companyName?.trim()) {
      setToast("Lütfen firma adınızı giriniz.");
      return;
    }
    if (!registerForm.phoneNumber?.trim()) {
      setToast("Lütfen telefon numaranızı giriniz.");
      return;
    }
    if (!provinceId || !districtId) {
      setToast("Lütfen il ve ilçe seçiniz.");
      return;
    }
    if (!selectedProvinceName || !selectedDistrictName) {
      setToast("Lütfen geçerli bir il ve ilçe seçiniz.");
      return;
    }
    if (!registerForm.fullAddress?.trim()) {
      setToast("Lütfen açık adresinizi giriniz.");
      return;
    }
    if (!registerForm.email?.trim()) {
      setToast("Lütfen e-posta adresinizi giriniz.");
      return;
    }
    if (!registerForm.password?.trim()) {
      setToast("Lütfen şifrenizi giriniz.");
      return;
    }
    if (registerForm.password.length < 6) {
      setToast("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    
    setRegistering(true);
    try {
      const payload = {
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        companyName: registerForm.companyName.trim(),
        phoneNumber: registerForm.phoneNumber.trim(),
        provinceId: Number(provinceId),
        districtId: Number(districtId),
        fullAddress: registerForm.fullAddress.trim(),
        serviceCity: selectedProvinceName, // Seçilen il otomatik olarak hizmet ili olarak kaydediliyor
        serviceDistrict: selectedDistrictName || undefined,
        email: registerForm.email.trim(),
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
    // Mevcut fotoğrafı preview'a yükle
    if (user?.photoUrl) {
      setProfilePhotoPreview(user.photoUrl);
    } else {
      setProfilePhotoPreview("");
    }
    setProfilePhoto(null);
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
      [profileForm.firstName, profileForm.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Kullanıcı";
    // Yeni fotoğraf yüklendiyse preview'ı kullan, yoksa mevcut fotoğrafı koru
    const photoUrl = profilePhotoPreview || user?.photoUrl || undefined;
    const updatedUser = {
      name: displayName,
      company: profileForm.companyName || user?.company,
      photoUrl: photoUrl,
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
    setToast("Profiliniz Guncellendi");
    // Fotoğraf state'lerini temizle
    setProfilePhoto(null);
    setProfilePhotoPreview("");
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
    setShowTowList(false); // modal ?stte olsun diye listeyi kapat
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
        driverPhoto: towPhoto,
      });
      setTowList((list) => [
        ...list,
        {
          id: newTow.id || Date.now(),
          name: newTow.driverName || towForm.name,
          plate: newTow.licensePlate || towForm.plate,
          location: [selectedDistrictName, selectedProvinceName]
            .filter(Boolean)
            .join(", "),
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

      // Listeyi yeniden yükle (fotoğraf güncellemesi için)
      await loadTowList(authToken);

      setTowForm({ name: "", plate: "", notes: "" });
      setTowPhoto(null);
      setTowPhotoPreview("");
      setShowTowModal(false);
      setShowTowList(true);
      setToast("Çekici eklendi");
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("failed to fetch")
      ) {
        setToast(
          "Çekici eklenemedi: API'ye ulasilamadi (CORS ya da 500 hatasi)."
        );
      } else {
        const message =
          err instanceof Error ? err.message : "Çekici eklenemedi";
        setToast(message);
      }
    } finally {
      setTowLoading(false);
    }
  };
  const handleTowUpdate = (
    id: number,
    field: "name" | "plate" | "notes",
    value: string
  ) => {
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
          list.map((item) =>
            item.id === id ? { ...item, isActive: false } : item
          )
        );
        setToast("Çekici pasifleştirildi");
      } else {
        await activateTowTruck(authToken, id);
        setTowList((list) =>
          list.map((item) =>
            item.id === id ? { ...item, isActive: true } : item
          )
        );
        setToast("Çekici aktifleştirildi");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Durum Güncellenemedi";
      setToast(message);
    }
  };

  const startTowEdit = (id: number) => {
    const current = towList.find((t) => t.id === id);
    if (!current) return;
    setEditingTowId(id);
    const districtNameFromState =
      current.areaDistrictId !== undefined && current.areaDistrictId !== null
        ? districts.find((d) => d.districtId === current.areaDistrictId)
            ?.districtName || ""
        : "";
    setEditingTowForm({
      name: current.name || "",
      plate: current.plate || "",
      provinceId: String(current.areaProvinceId || provinceId || ""),
      districtId: current.areaDistrictId ? String(current.areaDistrictId) : "",
      cityName: current.areaCity || selectedProvinceName || "",
      districtName:
        current.areaDistrict ||
        (current.areaDistrictId
          ? districtNameCache.current[current.areaDistrictId]
          : "") ||
        districtNameFromState ||
        selectedDistrictName ||
        "",
    });

    // Fotoğraf özelliği kaldırıldı
    setEditingTowPhoto(null);
    setEditingTowPhotoPreview("");

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
    setEditingTowForm({
      name: "",
      plate: "",
      provinceId: "",
      districtId: "",
      cityName: "",
      districtName: "",
    });
    setEditingDistricts([]);
    setEditingTowPhoto(null);
    setEditingTowPhotoPreview("");
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
        uniqueProvinces.find((p) => String(p.id) === editingTowForm.provinceId)
          ?.name || current.areaCity;
      const districtName =
        editingDistricts.find(
          (d) => String(d.districtId) === editingTowForm.districtId
        )?.districtName ||
        (editingTowForm.districtId
          ? districtNameCache.current[Number(editingTowForm.districtId)]
          : "") ||
        current.areaDistrict ||
        (current.areaDistrictId ? `İlce #${current.areaDistrictId}` : "");
      const updatePayload: {
        driverName?: string;
        licensePlate?: string;
        isActive?: boolean;
        areas?: {
          provinceId: number;
          districtId: number;
          city?: string;
          district?: string;
        }[];
        driverPhoto?: File | null;
      } = {
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
      };

      // Sadece yeni fotoğraf seçildiyse ekle
      if (editingTowPhoto) {
        updatePayload.driverPhoto = editingTowPhoto;
      }

      const updated = await updateTowTruck(authToken, id, updatePayload);
      const area = (updated as any).operatingAreas?.[0];
      const location = [area?.district, area?.city].filter(Boolean).join(", ");
      if (updated.id) {
        towLocCache.current[updated.id] = {
          city: area?.city || provinceName || current.areaCity,
          district: area?.district || districtName || current.areaDistrict,
        };
        localStorage.setItem(TOW_LOC_KEY, JSON.stringify(towLocCache.current));
      }
      // Listeyi yeniden yükle (fotoğraf güncellemesi için)
      await loadTowList(authToken);

      setEditingTowId(null);
      setEditingTowForm({
        name: "",
        plate: "",
        provinceId: "",
        districtId: "",
        cityName: "",
        districtName: "",
      });
      setEditingDistricts([]);
      setEditingTowPhoto(null);
      setEditingTowPhotoPreview("");
      setToast("Çekici Güncellendi");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Güncelleme başarısız";
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
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.logoButton}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Image
            src={logo}
            alt="Yoldan Çek"
            className={styles.logoImage}
            priority
          />
        </button>

        <div className={styles.topBarActions}>
          {user ? (
            <div className={styles.userArea}>
              <button
                type="button"
                className={styles.addTowButton}
                onClick={openTowModal}
              >
                <span className={styles.addTowIcon}>+</span>
                <span>Çekici ekle</span>
              </button>
              <button
                type="button"
                className={styles.userBadgeButton}
                onClick={toggleProfileMenu}
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
                <div>
                  <div className={styles.userName}>{user.name}</div>
                  {user.company && user.company !== user.name ? (
                    <div className={styles.userMeta}>{user.company}</div>
                  ) : null}
                </div>
                <span className={styles.caret}>¡</span>
              </button>
              {showProfileMenu ? (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownItem}
                    type="button"
                    onClick={openTowList}
                  >
                    <span className={styles.dropdownText}>Çekicilerim</span>
                    <span className={styles.dropdownArrow}>→</span>
                  </button>
                  <button
                    className={styles.dropdownItem}
                    type="button"
                    onClick={openProfile}
                  >
                    <span className={styles.dropdownText}>Profil</span>
                    <span className={styles.dropdownArrow}>→</span>
                  </button>
                  <div className={styles.dropdownDivider}></div>
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    type="button"
                    onClick={handleLogout}
                  >
                    <span className={styles.dropdownText}>Çıkış</span>
                    <span className={styles.dropdownArrow}>→</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setShowLogin(true)}
              >
                Giriş yap
              </button>
              <button
                className={styles.primary}
                type="button"
                onClick={() => setShowRegister(true)}
              >
                Kayıt ol
              </button>
            </div>
          )}
        </div>
      </div>

      {toast ? (
        <div
          className={styles.toast}
          onClick={() => setToast("")}
          role="alert"
          style={{ cursor: "pointer" }}
        >
          {toast}
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>Konum Seç</div>
            <div className={styles.panelSubtitle}>
              Yakınındaki çekicileri bulmak için konumunu seç
            </div>
          </div>
          <button
            className={styles.secondary}
            type="button"
            onClick={handleUseMyLocation}
          >
            Konumumu kullan
          </button>
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
                setMapQueryOverride("");
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
              onChange={(e) => {
                setDistrictId(e.target.value);
                setMapQueryOverride("");
              }}
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
            {mapQueryOverride ||
              `${selectedDistrictName || "İlçe seç"} | ${
                selectedProvinceName || "İl seç"
              }`}
          </div>
          {companies.length > 0 ? (
            <div className={styles.mapPins}>
              <div className={styles.mapPinsTitle}>Online Çekiciler</div>
              <div className={styles.mapPinsList}>
                {companies.slice(0, 12).map((c, idx) => {
                  const towTruck = c as CompanyDto & {
                    latitude?: number;
                    longitude?: number;
                    driverPhotoUrl?: string | null;
                  };
                  const locText =
                    [towTruck.district, towTruck.city || selectedProvinceName]
                      .filter(Boolean)
                      .join(", ") || "Konum yok";

                  const targetQuery =
                    towTruck.latitude && towTruck.longitude
                      ? `${towTruck.latitude},${towTruck.longitude}`
                      : locText === "Konum yok"
                      ? selectedProvinceName
                      : locText;

                  return (
                    <button
                      key={`${towTruck.id || idx}-pin`}
                      type="button"
                      className={styles.mapPinButton}
                      onClick={() => {
                        if (towTruck.latitude && towTruck.longitude) {
                          setMapQueryOverride(
                            `${towTruck.latitude},${towTruck.longitude}`
                          );
                        } else {
                          setMapQueryOverride(targetQuery);
                        }
                      }}
                    >
                      {towTruck.driverPhotoUrl ? (
                        <img
                          src={towTruck.driverPhotoUrl}
                          alt={towTruck.companyName || "Çekici"}
                          className={styles.mapPinAvatar}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const placeholder =
                              target.nextElementSibling as HTMLElement;
                            if (placeholder)
                              placeholder.style.display = "inline-block";
                          }}
                        />
                      ) : null}
                      {!towTruck.driverPhotoUrl && (
                        <span className={styles.mapPinDot} />
                      )}
                      {towTruck.driverPhotoUrl && (
                        <span
                          className={styles.mapPinDot}
                          style={{ display: "none" }}
                        />
                      )}
                      <div className={styles.mapPinText}>
                        <div className={styles.mapPinName}>
                          {towTruck.companyName || "Cekici"}
                        </div>
                        <div className={styles.mapPinMeta}>
                          {towTruck.latitude && towTruck.longitude
                            ? `${towTruck.latitude.toFixed(
                                4
                              )}, ${towTruck.longitude.toFixed(4)}`
                            : locText}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>Online Çekiciler</div>
        </div>
        {companiesLoading ? (
          <div className={styles.smallMuted}>Cekiciler yukleniyor...</div>
        ) : companies.length === 0 ? (
          <div className={styles.smallMuted}>
            Henüz listelenecek çekici yok.
          </div>
        ) : (
          <div className={styles.towTrucksGrid}>
            {companies.map((c, idx) => {
              const towTruck = c as CompanyDto & {
                licensePlate?: string | null;
                latitude?: number;
                longitude?: number;
              };
              const basePhone = (towTruck.phoneNumber || "").trim();
              const cleaned = basePhone.replace(/[^0-9+]/g, "");
              const withoutPrefixZeros = cleaned.startsWith("+")
                ? cleaned
                : cleaned.replace(/^0+/, "");
              const phoneWithCountry = withoutPrefixZeros
                ? withoutPrefixZeros.startsWith("+")
                  ? withoutPrefixZeros
                  : `+90 ${withoutPrefixZeros}`
                : "";
              const phoneHref = phoneWithCountry
                ? `tel:${phoneWithCountry.replace(/\s+/g, "")}`
                : undefined;

              return (
                <div
                  key={`${towTruck.id || idx}-${towTruck.companyName || "cmp"}`}
                  className={styles.towTruckCard}
                >
                  <div className={styles.towTruckCardHeader}>
                    {(towTruck as any).driverPhotoUrl ? (
                      <img
                        src={(towTruck as any).driverPhotoUrl}
                        alt={towTruck.companyName || "Çekici"}
                        className={styles.towTruckAvatar}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const placeholder =
                            target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {!(towTruck as any).driverPhotoUrl && (
                      <div className={styles.towTruckAvatarPlaceholder}>
                        {(towTruck.companyName || "Ç")[0].toUpperCase()}
                      </div>
                    )}
                    {(towTruck as any).driverPhotoUrl && (
                      <div
                        className={styles.towTruckAvatarPlaceholder}
                        style={{ display: "none" }}
                      >
                        {(towTruck.companyName || "Ç")[0].toUpperCase()}
                      </div>
                    )}
                    <div className={styles.towTruckInfo}>
                      <div className={styles.towTruckName}>
                        {towTruck.companyName || "Çekici"}
                      </div>
                      <div className={styles.towTruckLocation}>
                        {[towTruck.district, towTruck.city]
                          .filter(Boolean)
                          .join(", ") || "Konum belirtilmedi"}
                      </div>
                    </div>
                    {towTruck.distance && (
                      <div className={styles.towTruckDistance}>
                        {towTruck.distance.toFixed(1)} km
                      </div>
                    )}
                  </div>

                  <div className={styles.towTruckCardBody}>
                    <div className={styles.towTruckContact}>
                      <div className={styles.towTruckContactItem}>
                        <span className={styles.towTruckContactIcon}>📞</span>
                        <a href={phoneHref} className={styles.towTruckPhone}>
                          {phoneWithCountry || "Telefon yok"}
                        </a>
                      </div>
                      {towTruck.licensePlate && (
                        <div className={styles.towTruckContactItem}>
                          <span className={styles.towTruckContactIcon}>🚗</span>
                          <span className={styles.towTruckPlate}>
                            {towTruck.licensePlate}
                          </span>
                        </div>
                      )}
                    </div>

                    {towTruck.fullAddress && (
                      <div className={styles.towTruckAddress}>
                        <span className={styles.towTruckAddressIcon}>📍</span>
                        <span>{towTruck.fullAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.towTruckCardFooter}>
                    <button
                      className={styles.towTruckDetailButton}
                      type="button"
                      onClick={() => setSelectedTowTruck(towTruck)}
                    >
                      Detaylı Bilgi
                    </button>
                    {phoneHref && (
                      <a href={phoneHref} className={styles.towTruckCallButton}>
                        Ara
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Çekici Detay Popup */}
      {selectedTowTruck && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedTowTruck(null)}
        >
          <div
            className={styles.towTruckDetailModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.towTruckDetailHeader}>
              <button
                className={styles.modalCloseButton}
                type="button"
                onClick={() => setSelectedTowTruck(null)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            <div className={styles.towTruckDetailContent}>
              <div className={styles.towTruckDetailProfile}>
                {(selectedTowTruck as any).driverPhotoUrl ? (
                  <img
                    src={(selectedTowTruck as any).driverPhotoUrl}
                    alt={selectedTowTruck.companyName || "Çekici"}
                    className={styles.towTruckDetailAvatar}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const placeholder =
                        target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                {!(selectedTowTruck as any).driverPhotoUrl && (
                  <div className={styles.towTruckDetailAvatarPlaceholder}>
                    {(selectedTowTruck.companyName || "Ç")[0].toUpperCase()}
                  </div>
                )}
                {(selectedTowTruck as any).driverPhotoUrl && (
                  <div
                    className={styles.towTruckDetailAvatarPlaceholder}
                    style={{ display: "none" }}
                  >
                    {(selectedTowTruck.companyName || "Ç")[0].toUpperCase()}
                  </div>
                )}
                <div className={styles.towTruckDetailName}>
                  {selectedTowTruck.companyName || "Çekici"}
                </div>
                <div className={styles.towTruckDetailLocation}>
                  {[selectedTowTruck.district, selectedTowTruck.city]
                    .filter(Boolean)
                    .join(", ") || "Konum belirtilmedi"}
                </div>
                {selectedTowTruck.distance && (
                  <div className={styles.towTruckDetailDistance}>
                    {selectedTowTruck.distance.toFixed(1)} km uzaklıkta
                  </div>
                )}
              </div>

              <div className={styles.towTruckDetailInfo}>
                <div className={styles.towTruckDetailInfoItem}>
                  <div className={styles.towTruckDetailInfoLabel}>Telefon</div>
                  <div className={styles.towTruckDetailInfoValue}>
                    {(() => {
                      const basePhone = (
                        selectedTowTruck.phoneNumber || ""
                      ).trim();
                      const cleaned = basePhone.replace(/[^0-9+]/g, "");
                      const withoutPrefixZeros = cleaned.startsWith("+")
                        ? cleaned
                        : cleaned.replace(/^0+/, "");
                      const phoneWithCountry = withoutPrefixZeros
                        ? withoutPrefixZeros.startsWith("+")
                          ? withoutPrefixZeros
                          : `+90 ${withoutPrefixZeros}`
                        : "";
                      const phoneHref = phoneWithCountry
                        ? `tel:${phoneWithCountry.replace(/\s+/g, "")}`
                        : undefined;
                      return phoneHref ? (
                        <a
                          href={phoneHref}
                          className={styles.towTruckDetailPhoneLink}
                        >
                          {phoneWithCountry}
                        </a>
                      ) : (
                        <span>Telefon yok</span>
                      );
                    })()}
                  </div>
                </div>

                {selectedTowTruck.licensePlate && (
                  <div className={styles.towTruckDetailInfoItem}>
                    <div className={styles.towTruckDetailInfoLabel}>Plaka</div>
                    <div className={styles.towTruckDetailInfoValue}>
                      {selectedTowTruck.licensePlate}
                    </div>
                  </div>
                )}

                {selectedTowTruck.email && (
                  <div className={styles.towTruckDetailInfoItem}>
                    <div className={styles.towTruckDetailInfoLabel}>
                      E-posta
                    </div>
                    <div className={styles.towTruckDetailInfoValue}>
                      {selectedTowTruck.email}
                    </div>
                  </div>
                )}

                {selectedTowTruck.fullAddress && (
                  <div className={styles.towTruckDetailInfoItem}>
                    <div className={styles.towTruckDetailInfoLabel}>Adres</div>
                    <div className={styles.towTruckDetailInfoValue}>
                      {selectedTowTruck.fullAddress}
                    </div>
                  </div>
                )}

                {selectedTowTruck.serviceCity && (
                  <div className={styles.towTruckDetailInfoItem}>
                    <div className={styles.towTruckDetailInfoLabel}>
                      Hizmet Bölgesi
                    </div>
                    <div className={styles.towTruckDetailInfoValue}>
                      {selectedTowTruck.serviceCity}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.towTruckDetailActions}>
                {(() => {
                  const basePhone = (selectedTowTruck.phoneNumber || "").trim();
                  const cleaned = basePhone.replace(/[^0-9+]/g, "");
                  const withoutPrefixZeros = cleaned.startsWith("+")
                    ? cleaned
                    : cleaned.replace(/^0+/, "");
                  const phoneWithCountry = withoutPrefixZeros
                    ? withoutPrefixZeros.startsWith("+")
                      ? withoutPrefixZeros
                      : `+90 ${withoutPrefixZeros}`
                    : "";
                  const phoneHref = phoneWithCountry
                    ? `tel:${phoneWithCountry.replace(/\s+/g, "")}`
                    : undefined;
                  return phoneHref ? (
                    <a
                      href={phoneHref}
                      className={styles.towTruckDetailCallButton}
                    >
                      📞 Ara
                    </a>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {showTowModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Çekici ekle</div>
              </div>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setShowTowModal(false)}
              >
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
                  onChange={(e) =>
                    setTowForm({ ...towForm, name: e.target.value })
                  }
                  placeholder="Çekici adı"
                />
              </label>
              <label className={styles.field}>
                <span>Plaka</span>
                <input
                  className={styles.input}
                  value={towForm.plate}
                  onChange={(e) => {
                    const formatted = formatLicensePlate(e.target.value);
                    setTowForm({ ...towForm, plate: formatted });
                  }}
                  placeholder="34 ABC 123"
                  maxLength={11}
                />
              </label>
              <label className={styles.field}>
                <span>Çekici Fotoğrafı</span>
                <div className={styles.photoUpload}>
                  {towPhotoPreview ? (
                    <div className={styles.photoPreview}>
                      <img
                        src={towPhotoPreview}
                        alt="Preview"
                        className={styles.photoPreviewImage}
                      />
                      <button
                        type="button"
                        className={styles.photoRemoveButton}
                        onClick={() => {
                          setTowPhoto(null);
                          setTowPhotoPreview("");
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className={styles.photoUploadLabel}>
                      <input
                        type="file"
                        accept="image/*"
                        className={styles.photoInput}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setTowPhoto(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setTowPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className={styles.photoUploadButton}>
                        📷 Fotoğraf Seç
                      </div>
                    </label>
                  )}
                </div>
              </label>
              <label className={styles.field}>
                <span>Not</span>
                <textarea
                  className={styles.textarea}
                  value={towForm.notes}
                  onChange={(e) =>
                    setTowForm({ ...towForm, notes: e.target.value })
                  }
                  placeholder="Opsiyonel not"
                />
              </label>
              <div className={styles.buttonRow}>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() =>
                    askGeolocation((lat, lng) => {
                      geocodeAndFillNewTow(lat, lng);
                      setGeoLocation({ lat, lng });
                    })
                  }
                >
                  Konumumu kullan
                </button>
              </div>
            </div>
            <div className={styles.buttonRow}>
              <button
                className={styles.primary}
                onClick={handleTowSave}
                disabled={towLoading}
              >
                {towLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTowList ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTowList(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Çekicilerim</div>
                <div className={styles.smallMuted} style={{ marginTop: "4px" }}>
                  {towList.length} çekici{" "}
                  {towList.filter((t) => t.isActive).length > 0 &&
                    `(${towList.filter((t) => t.isActive).length} aktif)`}
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.addTowButton}
                  type="button"
                  onClick={openTowModal}
                >
                  <span className={styles.addTowIcon}>+</span>
                  <span>Yeni çekici</span>
                </button>
                <button
                  className={styles.modalCloseButton}
                  type="button"
                  onClick={() => setShowTowList(false)}
                  aria-label="Kapat"
                >
                  ×
                </button>
              </div>
            </div>
            <div className={styles.modalContent}>
              {towLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingSpinner}></div>
                  <div className={styles.smallMuted}>
                    Çekiciler yükleniyor...
                  </div>
                </div>
              ) : towList.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>🚛</div>
                  <div className={styles.emptyStateTitle}>
                    Henüz çekici eklenmemiş
                  </div>
                  <div className={styles.emptyStateText}>
                    Yeni çekici eklemek için butona tıklayın
                  </div>
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={openTowModal}
                  >
                    + Çekici Ekle
                  </button>
                </div>
              ) : (
                <div className={styles.towListGrid}>
                  {towList.map((item) => (
                    <div key={item.id} className={styles.towListItem}>
                      <div className={styles.towListItemHeader}>
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name || "Çekici"}
                            className={styles.towListItemAvatar}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : null}
                        <div className={styles.towListItemName}>
                          {item.name || "Çekici"}
                        </div>
                        <span
                          className={`${styles.towListItemStatus} ${
                            item.isActive ? styles.active : styles.inactive
                          }`}
                        >
                          {item.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <div className={styles.towListItemInfo}>
                        <div className={styles.towListItemInfoRow}>
                          <span className={styles.towListItemInfoIcon}>🚗</span>
                          <span className={styles.smallMuted}>Plaka:</span>
                          <span className={styles.towListItemPlate}>
                            {item.plate || "-"}
                          </span>
                        </div>
                        <div className={styles.towListItemInfoRow}>
                          <span className={styles.towListItemInfoIcon}>📍</span>
                          <span className={styles.smallMuted}>Konum:</span>
                          <span className={styles.towListItemInfoValue}>
                            {[
                              item.areaDistrict || selectedDistrictName,
                              item.areaCity || selectedProvinceName,
                            ]
                              .filter(Boolean)
                              .join(", ") ||
                              item.location ||
                              "Belirtilmedi"}
                          </span>
                        </div>
                      </div>
                      {editingTowId === item.id ? (
                        <div className={styles.towListItemEditForm}>
                          <div className={styles.formGrid}>
                            <label className={styles.field}>
                              <span>Ad</span>
                              <input
                                className={styles.input}
                                value={editingTowForm.name}
                                onChange={(e) =>
                                  setEditingTowForm({
                                    ...editingTowForm,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className={styles.field}>
                              <span>Plaka</span>
                              <input
                                className={styles.input}
                                value={editingTowForm.plate}
                                onChange={(e) => {
                                  const formatted = formatLicensePlate(
                                    e.target.value
                                  );
                                  setEditingTowForm({
                                    ...editingTowForm,
                                    plate: formatted,
                                  });
                                }}
                                placeholder="34 ABC 123"
                                maxLength={11}
                              />
                            </label>
                            <label className={styles.field}>
                              <span>Çekici Fotoğrafı</span>
                              <div className={styles.photoUpload}>
                                {editingTowPhotoPreview ? (
                                  <div className={styles.photoPreview}>
                                    <img
                                      src={editingTowPhotoPreview}
                                      alt="Preview"
                                      className={styles.photoPreviewImage}
                                    />
                                    <button
                                      type="button"
                                      className={styles.photoRemoveButton}
                                      onClick={() => {
                                        setEditingTowPhoto(null);
                                        setEditingTowPhotoPreview("");
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <label className={styles.photoUploadLabel}>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className={styles.photoInput}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setEditingTowPhoto(file);
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setEditingTowPhotoPreview(
                                              reader.result as string
                                            );
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <div className={styles.photoUploadButton}>
                                      📷 Fotoğraf Seç
                                    </div>
                                  </label>
                                )}
                              </div>
                            </label>
                            <label className={styles.field}>
                              <span>Il</span>
                              <select
                                className={styles.select}
                                value={editingTowForm.provinceId}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  const provName =
                                    uniqueProvinces.find(
                                      (p) => String(p.id) === val
                                    )?.name || "";
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
                                      const fetched = await getDistricts(
                                        Number(val)
                                      );
                                      setEditingDistricts(fetched);
                                    } catch {
                                      setEditingDistricts([]);
                                    }
                                  }
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
                              <span>Ilce</span>
                              <select
                                className={styles.select}
                                value={editingTowForm.districtId}
                                onChange={(e) =>
                                  setEditingTowForm({
                                    ...editingTowForm,
                                    districtId: e.target.value,
                                    districtName:
                                      editingDistricts.find(
                                        (d) =>
                                          String(d.districtId) ===
                                          e.target.value
                                      )?.districtName || "",
                                  })
                                }
                                disabled={!editingTowForm.provinceId}
                              >
                                <option value="">Ilce secin</option>
                                {editingDistricts.map((d) => (
                                  <option
                                    key={d.districtId}
                                    value={d.districtId}
                                  >
                                    {d.districtName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className={styles.buttonRow}>
                              <button
                                className={styles.secondary}
                                type="button"
                                onClick={() => {
                                  askGeolocation((lat, lng) => {
                                    setGeoLocation({ lat, lng });
                                    geocodeAndFillEditTow();
                                  });
                                }}
                              >
                                📍 Konumumu kullan
                              </button>
                            </div>
                          </div>
                          <div className={styles.buttonRow}>
                            <button
                              className={styles.primary}
                              type="button"
                              onClick={() => handleTowEditSave(item.id)}
                              disabled={towLoading}
                            >
                              {towLoading ? "Kaydediliyor..." : "✓ Kaydet"}
                            </button>
                            <button
                              className={styles.secondary}
                              type="button"
                              onClick={cancelTowEdit}
                              disabled={towLoading}
                            >
                              ✕ Vazgeç
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.towListItemActions}>
                          <button
                            className={`${styles.secondary} ${styles.towListActionButton}`}
                            type="button"
                            onClick={() => handleTowToggleActive(item.id)}
                          >
                            {item.isActive ? "⏸ Pasiflestir" : "▶ Aktiflestir"}
                          </button>
                          <button
                            className={`${styles.secondary} ${styles.towListActionButton}`}
                            type="button"
                            onClick={() => startTowEdit(item.id)}
                          >
                            ✏️ Düzenle
                          </button>
                          <button
                            className={`${styles.secondary} ${styles.towListActionButton} ${styles.deleteButton}`}
                            type="button"
                            onClick={() => handleTowDelete(item.id)}
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showRegister ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.registerModal}>
            <div className={styles.registerHeader}>
              <div className={styles.registerLogoWrapper}>
                <Image
                  src={logo}
                  alt="Yoldan Çek"
                  className={styles.registerLogo}
                  priority
                />
              </div>
              <h2 className={styles.registerTitle}>Hesap Oluştur</h2>
              <p className={styles.registerSubtitle}>
                Yeni hesabınızı oluşturun ve başlayın
              </p>
              <button
                className={styles.registerCloseButton}
                type="button"
                onClick={() => setShowRegister(false)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            {toast ? <div className={styles.toast}>{toast}</div> : null}
            <div className={styles.registerForm}>
              <div className={styles.registerFormGrid}>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Ad <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    value={registerForm.firstName}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        firstName: e.target.value,
                      })
                    }
                    placeholder="Adınız"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Soyad <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    value={registerForm.lastName}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        lastName: e.target.value,
                      })
                    }
                    placeholder="Soyadınız"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Firma Adı <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    value={registerForm.companyName}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        companyName: e.target.value,
                      })
                    }
                    placeholder="Örn: Mavi Oto"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Telefon <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    value={registerForm.phoneNumber}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+90 5xx xxx xx xx"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    E-posta <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    type="email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="firma@ornek.com"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Şifre <span className={styles.required}>*</span>
                  </span>
                  <input
                    className={styles.registerInput}
                    type="password"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Minimum 6 karakter"
                    required
                    minLength={6}
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    İl <span className={styles.required}>*</span>
                  </span>
                  <select
                    className={styles.registerSelect}
                    value={provinceId}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setProvinceId(val);
                      setDistrictId("");
                      setDistricts([]);
                      if (val) {
                        const fetched = await getDistricts(Number(val));
                        setDistricts(fetched);
                      }
                    }}
                    required
                  >
                    <option value="">İl seçin</option>
                    {uniqueProvinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    İlçe <span className={styles.required}>*</span>
                  </span>
                  <select
                    className={styles.registerSelect}
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                    }}
                    disabled={!provinceId}
                    required
                  >
                    <option value="">İlçe seçin</option>
                    {districts.map((d) => (
                      <option key={d.districtId} value={d.districtId}>
                        {d.districtName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Açık Adres <span className={styles.required}>*</span>
                  </span>
                  <textarea
                    className={styles.registerTextarea}
                    value={registerForm.fullAddress}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        fullAddress: e.target.value,
                      })
                    }
                    placeholder="Adres"
                    required
                  />
                </label>
                <label className={styles.registerField}>
                  <span className={styles.registerFieldLabel}>
                    Avatar (opsiyonel)
                  </span>
                  <input
                    className={styles.registerFileInput}
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
                  <div className={styles.registerAvatarRow}>
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Önizleme"
                        className={styles.registerAvatar}
                      />
                    ) : (
                      <div className={styles.registerAvatarPlaceholder}>
                        {initials}
                      </div>
                    )}
                    <span className={styles.registerAvatarHint}>Opsiyonel</span>
                  </div>
                </label>
              </div>
              <button
                className={styles.registerSubmitButton}
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? (
                  <>
                    <span className={styles.registerButtonLoader}></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <span>Kayıt Ol</span>
                    <span className={styles.registerButtonArrow}>→</span>
                  </>
                )}
              </button>
              <div className={styles.registerFooter}>
                <p className={styles.registerFooterText}>
                  Zaten hesabınız var mı?{" "}
                  <button
                    type="button"
                    className={styles.registerFooterLink}
                    onClick={() => {
                      setShowRegister(false);
                      setShowLogin(true);
                    }}
                  >
                    Giriş Yap
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showLogin ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.loginModal}>
            <div className={styles.loginHeader}>
              <div className={styles.loginLogoWrapper}>
                <Image
                  src={logo}
                  alt="Yoldan Çek"
                  className={styles.loginLogo}
                  priority
                />
              </div>
              <h2 className={styles.loginTitle}>Hoş Geldiniz</h2>
              <p className={styles.loginSubtitle}>Hesabınıza giriş yapın</p>
              <button
                className={styles.loginCloseButton}
                type="button"
                onClick={() => setShowLogin(false)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            {toast ? <div className={styles.toast}>{toast}</div> : null}
            <div className={styles.loginForm}>
              <label className={styles.loginField}>
                <span className={styles.loginFieldLabel}>E-posta Adresi</span>
                <input
                  className={styles.loginInput}
                  type="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  placeholder="ornek@firma.com"
                />
              </label>
              <label className={styles.loginField}>
                <span className={styles.loginFieldLabel}>Şifre</span>
                <div className={styles.loginPasswordWrap}>
                  <input
                    className={styles.loginInput}
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    placeholder="Şifrenizi girin"
                  />
                  <button
                    type="button"
                    className={styles.loginEyeButton}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={
                      showPassword ? "Şifreyi gizle" : "Şifreyi göster"
                    }
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </label>
              <button
                className={styles.loginSubmitButton}
                onClick={handleLogin}
                disabled={registering}
              >
                {registering ? (
                  <>
                    <span className={styles.loginButtonLoader}></span>
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <span>Giriş Yap</span>
                    <span className={styles.loginButtonArrow}>→</span>
                  </>
                )}
              </button>
              <div className={styles.loginFooter}>
                <p className={styles.loginFooterText}>
                  Hesabınız yok mu?{" "}
                  <button
                    type="button"
                    className={styles.loginFooterLink}
                    onClick={() => {
                      setShowLogin(false);
                      setShowRegister(true);
                    }}
                  >
                    Kayıt Ol
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showProfileModal ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowProfileModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.panelTitle}>Profilim</div>
                <div className={styles.smallMuted} style={{ marginTop: "4px" }}>
                  Profil bilgilerinizi güncelleyin
                </div>
              </div>
              <button
                className={styles.modalCloseButton}
                type="button"
                onClick={() => setShowProfileModal(false)}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatarSection}>
                  {profilePhotoPreview ? (
                    <div className={styles.profileAvatarWrapper}>
                      <img
                        src={profilePhotoPreview}
                        alt={user?.name || "Kullanıcı"}
                        className={styles.profileAvatar}
                      />
                      <button
                        type="button"
                        className={styles.profileAvatarRemoveButton}
                        onClick={() => {
                          setProfilePhoto(null);
                          setProfilePhotoPreview("");
                        }}
                        aria-label="Fotoğrafı kaldır"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={styles.profileAvatarPlaceholder}>
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className={styles.profileAvatarInfo}>
                    <div className={styles.profileName}>
                      {user?.name || "Kullanıcı"}
                    </div>
                    {user?.company && user.company !== user?.name ? (
                      <div className={styles.smallMuted}>{user.company}</div>
                    ) : null}
                  </div>
                </div>
                <div className={styles.profilePhotoUpload}>
                  <label className={styles.profilePhotoUploadLabel}>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.photoInput}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfilePhoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfilePhotoPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className={styles.profilePhotoUploadButton}>
                      <span className={styles.uploadIcon}>📷</span>
                      <span>
                        {profilePhotoPreview
                          ? "Fotoğrafı Değiştir"
                          : "Şirket Fotoğrafı Ekle"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <div className={styles.profileFormSection}>
                <div className={styles.sectionTitle}>
                  <span className={styles.sectionTitleIcon}>👤</span>
                  Kişisel Bilgiler
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>✏️</span>
                      Ad
                    </span>
                    <input
                      className={styles.profileInput}
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          firstName: e.target.value,
                        })
                      }
                      placeholder="Adınızı girin"
                    />
                  </label>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>✏️</span>
                      Soyad
                    </span>
                    <input
                      className={styles.profileInput}
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          lastName: e.target.value,
                        })
                      }
                      placeholder="Soyadınızı girin"
                    />
                  </label>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>🏢</span>
                      Firma
                    </span>
                    <input
                      className={styles.profileInput}
                      value={profileForm.companyName}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="Firma adınızı girin"
                    />
                  </label>
                </div>
              </div>
              <div className={styles.profileFormSection}>
                <div className={styles.sectionTitle}>
                  <span className={styles.sectionTitleIcon}>📧</span>
                  İletişim Bilgileri
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>📧</span>
                      E-posta
                    </span>
                    <input
                      className={styles.profileInput}
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="ornek@mail.com"
                    />
                  </label>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>📱</span>
                      Telefon
                    </span>
                    <input
                      className={styles.profileInput}
                      value={profileForm.phoneNumber}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phoneNumber: e.target.value,
                        })
                      }
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </label>
                </div>
              </div>
              <div className={styles.profileFormSection}>
                <div className={styles.sectionTitle}>
                  <span className={styles.sectionTitleIcon}>📍</span>
                  Konum Bilgileri
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.profileField}>
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>🏙️</span>
                      Hizmet Şehri
                    </span>
                    <input
                      className={styles.profileInput}
                      value={profileForm.serviceCity}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          serviceCity: e.target.value,
                        })
                      }
                      placeholder="Hizmet verdiğiniz şehir"
                    />
                  </label>
                  <label
                    className={styles.profileField}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={styles.fieldLabel}>
                      <span className={styles.fieldIcon}>📍</span>
                      Adres
                    </span>
                    <textarea
                      className={styles.profileTextarea}
                      value={profileForm.fullAddress}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          fullAddress: e.target.value,
                        })
                      }
                      placeholder="Detaylı adres bilgisi"
                      rows={4}
                    />
                  </label>
                  <div
                    className={styles.buttonRow}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <button
                      className={styles.locationButton}
                      type="button"
                      onClick={() =>
                        askGeolocation((lat, lng) => {
                          const locText = `Konum: ${lat.toFixed(
                            5
                          )},${lng.toFixed(5)}`;
                          setProfileForm((f) => ({
                            ...f,
                            fullAddress: f.fullAddress
                              ? `${f.fullAddress} | ${locText}`
                              : locText,
                          }));
                          setToast(
                            "Konum eklendi, gerekirse il/ilceyi elle yazabilirsiniz."
                          );
                          setGeoLocation({ lat, lng });
                        })
                      }
                    >
                      <span className={styles.buttonIcon}>📍</span>
                      <span>Konumumu Kullan</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className={styles.profileActions}>
                <button
                  className={styles.profileSaveButton}
                  onClick={handleProfileSave}
                >
                  <span className={styles.buttonIcon}>✓</span>
                  <span>Profilimi Güncelle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}