import { Tabs } from 'antd';

import { CompaniesPage } from './CompaniesPage/CompaniesPage';
import { PageHeader } from '../../shared/PageHeader';
import { LocationsSettings } from './LocationsSettings';
import { PeriodsPage } from './PeriodsPage/PeriodsPage';
import { TariffsPage } from './TariffsPage/TariffsPage';

/** Màn "Cấu hình" của quản trị: kỳ thu, biểu giá, công ty & địa bàn công ty phụ trách. */
export function ConfigPage() {
  return (
    <>
      <PageHeader title="Cấu hình" description="Kỳ thu, biểu giá, công ty và địa bàn." />
      <Tabs
        items={[
          { key: 'periods', label: 'Kỳ thu', children: <PeriodsPage /> },
          { key: 'tariffs', label: 'Biểu giá', children: <TariffsPage /> },
          { key: 'companies', label: 'Công ty & địa bàn', children: <CompaniesPage admin /> },
          { key: 'locations', label: 'Thiết lập địa bàn', children: <LocationsSettings /> },
        ]}
      />
    </>
  );
}
