const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://server.muhammedeminkecik.com.tr:5002";

export type City = {
  id?: string;
  provinceId: number;
  cityName?: string;
};

export type District = {
  id?: string;
  districtId: number;
  districtName?: string;
};

export type CompanyDto = {
  id?: number;
  companyName?: string;
  city?: string | null;
  district?: string | null;
  distance?: number | null;
  serviceCity?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
};

export type AuthResponseDto = {
  token?: string | null;
  expiresAt?: string;
  company?: CompanyDto;
};

export type CompanyRegistrationDto = {
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
  provinceId: number;
  districtId: number;
  city?: string | null;
  district?: string | null;
  fullAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  serviceCity: string;
  serviceDistrict?: string | null;
  email: string;
  password: string;
};

export type CompanyLoginDto = {
  email: string;
  password: string;
};

export type TicketDto = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  subject: string;
  message: string;
};

export type TowTruck = {
  id?: number;
  licensePlate?: string | null;
  driverName?: string | null;
  driverPhotoUrl?: string | null;
  isActive?: boolean;
};

type ApiOptions = RequestInit & { token?: string };

async function api<T>(path: string, options: ApiOptions = {}) {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);
  if (!res.ok) {
    const message =
      (data as { message?: string })?.message ||
      res.statusText ||
      "İstek başarısız";
    throw new Error(message);
  }
  return data;
}

export async function getCities() {
  const data = await api<{ data?: City[] }>("/api/Address/cities");
  return data.data || [];
}

export async function getDistricts(provinceId?: number) {
  if (!provinceId) return [];
  const data = await api<{ data?: District[] }>(
    `/api/Address/districts/${provinceId}`
  );
  return data.data || [];
}

export async function registerCompany(payload: CompanyRegistrationDto) {
  return api<AuthResponseDto>("/api/Auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginCompany(payload: CompanyLoginDto) {
  return api<AuthResponseDto>("/api/Auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProfile(token?: string) {
  if (!token) return null;
  return api<CompanyDto>("/api/Profile", { token });
}

export async function updateCompany(
  token: string | undefined,
  payload: Partial<CompanyRegistrationDto>
) {
  if (!token) throw new Error("Oturum bulunamadı");
  return api<CompanyDto>("/api/Companies/me", {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
  });
}

export async function findNearestCompanies(params: {
  latitude?: number;
  longitude?: number;
  limit?: number;
  provinceId?: number;
  districtId?: number;
}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return api<CompanyDto[]>(`/api/Companies/nearest${qs ? `?${qs}` : ""}`);
}

export async function createTicket(payload: TicketDto) {
  return api("/api/Tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTickets(token?: string) {
  if (!token) return [];
  return api("/api/Tickets", { token });
}

export async function setTicketStatus(
  token: string | undefined,
  id: number,
  status: number
) {
  if (!token) throw new Error("Oturum bulunamadı");
  return api(`/api/Tickets/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(status),
    token,
  });
}

export async function listTowTrucks(token?: string) {
  if (!token) return [];
  return api<TowTruck[]>("/api/TowTrucks/my", { token });
}

export async function addTowTruck(
  token: string | undefined,
  payload: {
    licensePlate: string;
    driverName: string;
    areas: { provinceId: number; districtId: number; city?: string }[];
  }
) {
  if (!token) throw new Error("Oturum bulunamadı");
  const form = new FormData();
  form.append("LicensePlate", payload.licensePlate);
  form.append("DriverName", payload.driverName);
  form.append("AreasJson", JSON.stringify(payload.areas));

  const res = await fetch(`${API_BASE}/api/TowTrucks`, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const message = res.statusText || "Çekici eklenemedi";
    throw new Error(message);
  }
  return (await res.json()) as TowTruck;
}

export async function deactivateTowTruck(token: string | undefined, id: number) {
  if (!token) throw new Error("Oturum bulunamadı");
  return api(`/api/TowTrucks/${id}/deactivate`, {
    method: "PUT",
    token,
  });
}

export async function deleteTowTruck(token: string | undefined, id: number) {
  if (!token) throw new Error("Oturum bulunamadı");
  return api(`/api/TowTrucks/${id}`, {
    method: "DELETE",
    token,
  });
}
