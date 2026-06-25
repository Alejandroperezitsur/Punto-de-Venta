import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreditCard, Check } from 'lucide-react';

export default function SubscriptionView() {
  const { t } = useTranslation();

  const plans = [
    { id: 'free', name: t('subscription.free'), price: t('subscription.freePrice'), features: [t('subscription.upTo100Products'), t('subscription.oneUser'), t('subscription.basicSales'), t('subscription.communitySupport')], cta: t('subscription.current'), active: true },
    { id: 'pro', name: t('subscription.professional'), price: t('subscription.proPrice'), features: [t('subscription.unlimitedProducts'), t('subscription.fiveUsers'), t('subscription.advancedReports'), t('subscription.prioritySupport'), t('subscription.autoBackups')], cta: t('subscription.upgrade'), active: false },
  ];

  return (
    <div>
      <PageHeader title={t('subscription.title')} description={t('subscription.description')} icon={CreditCard} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        {plans.map(plan => (
          <Card key={plan.id} className={plan.active ? 'border-accent/30' : ''}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-text-primary">{plan.name}</h3>
                <p className="text-[var(--text-display)] font-bold text-text-primary">{plan.price}</p>
              </div>
              {plan.active && <Badge variant="accent" size="xs">{t('subscription.current')}</Badge>}
            </div>
            <ul className="space-y-2 mb-4">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="size-3.5 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.active ? 'secondary' : 'primary'} className="w-full" disabled={plan.active} size="sm">
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
