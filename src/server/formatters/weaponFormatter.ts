import {Weapon, WeaponType} from "@prisma/client";

type WeaponByType = Record<WeaponType, Weapon[]>

export const getWeaponsByType = (weapons: Weapon[]): WeaponByType => {
  return weapons.reduce((acc, weapon) => {
    (acc[weapon.weaponType] ??= []).push(weapon)
    return acc;
  }, {} as WeaponByType);
}

