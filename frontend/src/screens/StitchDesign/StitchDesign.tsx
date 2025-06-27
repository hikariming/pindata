// frontend/src/screens/StitchDesign/StitchDesign.tsx

import React from 'react';
import { Layout } from '../../components/Layout';
import { ActivitySection } from './sections/ActivitySection';

/**
 * StitchDesign组件
 * 
 * @returns {JSX.Element} StitchDesign页面
 */
export const StitchDesign: React.FC = (): JSX.Element => {
  return (
    <Layout>
      <ActivitySection />
    </Layout>
  );
};
