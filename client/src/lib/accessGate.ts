type EmailCarrier = { email: string | null } | null | undefined;

export function dashboardAccessGranted(sessionUser: EmailCarrier, serverUser: EmailCarrier) {
  const sessionEmail = sessionUser?.email?.trim().toLowerCase();
  const serverEmail = serverUser?.email?.trim().toLowerCase();
  return Boolean(sessionEmail && serverEmail && sessionEmail === serverEmail);
}

