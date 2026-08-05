export function isPackageAddOnCheckoutEnabled(value = process.env.PACKAGE_ADD_ON_CHECKOUT_ENABLED) {
  return value === 'true';
}
