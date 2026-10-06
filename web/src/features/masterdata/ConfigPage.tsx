import { Tabs } from 'antd';

import { CompaniesPage } from './CompaniesPage/CompaniesPage';
import { PageHeader } from '../../shared/PageHeader';
import { CommuneBankAccountPage } from './CommuneBankAccountPage';
import { LocationsSettings } from './LocationsSettings';
import { PeriodsPage } from './PeriodsPage/PeriodsPage';
import { TariffsPage } from './TariffsPage/TariffsPage';

/** Màn "Cấu hình" của quản trị: kỳ thu, biểu giá, công ty & địa bàn công ty phụ trách, tài khoản nhận chuyển khoản của xã. */
export function ConfigPage() {
  return (
    <>
      <PageHeader title="Cấu hình" description="Kỳ thu, biểu giá, công ty, địa bàn và tài khoản nhận chuyển khoản của xã." />
      <Tabs
        items={[
          { key: 'periods', label: 'Kỳ thu', children: <PeriodsPage /> },
          { key: 'tariffs', label: 'Biểu giá', children: <TariffsPage /> },
          { key: 'companies', label: 'Công ty & địa bàn', children: <CompaniesPage admin /> },
          { key: 'locations', label: 'Thiết lập địa bàn', children: <LocationsSettings /> },
          { key: 'bank', label: 'Tài khoản nhận chuyển khoản', children: <CommuneBankAccountPage /> },
        ]}
      />
    </>
  );
}
