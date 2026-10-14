import { ENVIRONMENTS } from '../lib/config/environments.js';
import { EnvironmentName } from '../lib/enums/environment-name.enum.js';

describe('environment config', () => {
  const dev = ENVIRONMENTS[EnvironmentName.Dev];
  const prod = ENVIRONMENTS[EnvironmentName.Prod];

  it('prod keeps its data and survives an AZ outage', () => {
    expect(prod.retainData).toBe(true);
    expect(prod.natGateways).toBe(prod.availabilityZones.length);
    expect(prod.aurora.readers).toBeGreaterThanOrEqual(1);
    expect(prod.cache.replicas).toBeGreaterThanOrEqual(1);
    expect(prod.eks.minNodes).toBeGreaterThanOrEqual(prod.availabilityZones.length);
  });

  it('dev is small and disposable', () => {
    expect(dev.retainData).toBe(false);
    expect(dev.natGateways).toBe(1);
    expect(dev.aurora.maxCapacityAcu).toBeLessThan(prod.aurora.maxCapacityAcu);
  });

  it('environments never share an account or a network range', () => {
    expect(dev.account).not.toBe(prod.account);
    expect(dev.network.cidr).not.toBe(prod.network.cidr);
  });

  it('every environment spans three AZs of its region', () => {
    for (const config of Object.values(ENVIRONMENTS)) {
      expect(config.availabilityZones).toHaveLength(3);
      for (const zone of config.availabilityZones)
        expect(zone.startsWith(config.region)).toBe(true);
    }
  });
});
