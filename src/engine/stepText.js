/**
 * stepText — reja qadamining sarlavhasi / izohi / CTA matni.
 *
 * Ilgari TrajectoryPlan.jsx ichida yashirin turardi. Endi uch joy shu bitta
 * manbadan o'qiydi: reja ro'yxati, test natijasi ekranidagi «keyingi qadam»
 * va push eslatmasi uchun e'lon qilinadigan sarlavha. Aks holda bitta qadam
 * uchta joyda uch xil nom bilan atalardi.
 *
 * Sof funksiya — `t` tashqaridan beriladi, i18n instansiyasiga bog'lanmaydi.
 */

// i18n kaliti + parametrlar (qadam turiga qarab)
export const stepText = (step, t) => {
  switch (step.type) {
    case 'retention':
      return {
        title: t('trajectory.retentionTitle'),
        desc: t('trajectory.retentionDesc', { count: step.count }),
        cta: t('trajectory.retentionCta'),
      };
    case 'practice':
      return {
        title: t('trajectory.practiceTitle', { topic: step.topicName }),
        desc: t('trajectory.practiceDesc', {
          acc: step.acc ?? 0,
          batch: step.batch,
          target: step.targetAcc,
        }),
        cta: t('trajectory.practiceCta', { count: step.batch }),
      };
    case 'mixed':
      return {
        title: t('trajectory.mixedTitle'),
        desc: t('trajectory.mixedDesc', {
          topics: (step.topicNames || []).join(', '),
          batch: step.batch,
        }),
        cta: t('trajectory.practiceCta', { count: step.batch }),
      };
    case 'refresh':
      return {
        title: t('trajectory.refreshTitle', { topic: step.topicName }),
        desc: t('trajectory.refreshDesc', { days: step.days, batch: step.batch }),
        cta: t('trajectory.practiceCta', { count: step.batch }),
      };
    case 'coverage':
      return {
        title: t('trajectory.coverageTitle', { topic: step.topicName }),
        desc: t('trajectory.coverageDesc', { answered: step.answered, target: step.targetN }),
        cta: t('trajectory.coverageCta'),
      };
    case 'mistakes':
      return {
        title: t('trajectory.mistakesTitle'),
        desc: t('trajectory.mistakesDesc', { count: step.count }),
        cta: t('trajectory.mistakesCta'),
      };
    case 'exam':
      return {
        title: t('trajectory.examTitle'),
        desc: t('trajectory.examDesc'),
        cta: t('trajectory.examCta'),
      };
    default:
      return { title: '', desc: '', cta: '' };
  }
};

export default stepText;
