import { describe, expect, it } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function memberContext(): TrpcContext {
  return {
    user: {
      openId: 'member-test',
      email: 'member@thehumblevillage.org',
      name: 'Member',
      loginMethod: 'password',
      role: 'user',
    },
    req: { headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

function ownerContext(): TrpcContext {
  return {
    user: {
      openId: 'owner-test',
      email: 'emary626@gmail.com',
      name: 'Liz',
      loginMethod: 'password',
      role: 'admin',
    },
    req: { headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('team access router', () => {
  it('rejects access-list reads from non-owner team members', async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.teamAccess.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects password account creation and reset from non-owner team members', async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.teamAccess.createAccount({
      email: 'new.member@thehumblevillage.org',
      password: 'StrongTemporaryPass!1',
    })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.teamAccess.setPassword({
      email: 'new.member@thehumblevillage.org',
      password: 'AnotherStrongPass!1',
    })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows the owner to retrieve the current approved access list', async () => {
    const caller = appRouter.createCaller(ownerContext());
    const members = await caller.teamAccess.list();
    expect(members).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: 'emary626@gmail.com', role: 'owner', isActive: true }),
    ]));
  });
});
