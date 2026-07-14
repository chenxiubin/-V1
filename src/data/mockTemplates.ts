import { TemplateSuite } from '../types/schemas';

export const MOCK_TEMPLATES: TemplateSuite[] = [
  {
    id: 'ts-business-office',
    name: '商务办公视觉方案',
    category: '商务办公',
    productType: ['desk_calendar', 'wall_calendar'],
    description: '适用于高档写字楼、极简办公桌面的高质感视觉风格。主打深邃高雅底色与金属、木质质感，突显专业与沉稳。',
    styleSystem: {
      colors: ['#FFFFFF', '#1E293B', '#F1F5F9'],
      fonts: ['Inter', 'Space Grotesk']
    },
    variants: [
      {
        id: 'tv-business-1-1',
        aspectRatio: '1:1',
        canvasSize: { width: 800, height: 800 },
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=200&h=200',
        slots: [
          {
            id: 'slot-bg',
            type: 'background',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 0,
            label: '办公桌面背景',
            isRequired: true,
            allowAI: true
          },
          {
            id: 'slot-product',
            type: 'product',
            rect: { x: 20, y: 25, width: 60, height: 60 },
            zIndex: 10,
            label: '产品主体',
            isRequired: true,
            allowAI: false
          }
        ]
      }
    ]
  },
  {
    id: 'ts-holiday-gift',
    name: '节日礼赠视觉方案',
    category: '节日礼赠',
    productType: ['desk_calendar', 'wall_calendar', 'packaging', 'combination'],
    description: '温馨、奢华的节日礼赠风格。适合新年、中秋等传统节日，采用红色、金色等喜庆且尊贵的主体基调。',
    styleSystem: {
      colors: ['#DC2626', '#F59E0B', '#FFFBEB'],
      fonts: ['Inter', 'Playfair Display']
    },
    variants: [
      {
        id: 'tv-holiday-1-1',
        aspectRatio: '1:1',
        canvasSize: { width: 800, height: 800 },
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=200&h=200',
        slots: [
          {
            id: 'slot-bg',
            type: 'background',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 0,
            label: '节日礼赠背景',
            isRequired: true,
            allowAI: true
          },
          {
            id: 'slot-product',
            type: 'product',
            rect: { x: 20, y: 25, width: 60, height: 60 },
            zIndex: 10,
            label: '产品主体',
            isRequired: true,
            allowAI: false
          }
        ]
      }
    ]
  },
  {
    id: 'ts-young-lifestyle',
    name: '年轻生活视觉方案',
    category: '年轻生活',
    productType: ['desk_calendar', 'wall_calendar', 'combination'],
    description: '充满朝气、清新活力的INS风格。主打柔和的马卡龙色调与轻盈亚克力质感，迎合年轻人的生活美学。',
    styleSystem: {
      colors: ['#EC4899', '#3B82F6', '#F0FDFA'],
      fonts: ['Inter', 'Outfit']
    },
    variants: [
      {
        id: 'tv-young-1-1',
        aspectRatio: '1:1',
        canvasSize: { width: 800, height: 800 },
        previewUrl: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=200&h=200',
        slots: [
          {
            id: 'slot-bg',
            type: 'background',
            rect: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 0,
            label: '潮流生活背景',
            isRequired: true,
            allowAI: true
          },
          {
            id: 'slot-product',
            type: 'product',
            rect: { x: 20, y: 25, width: 60, height: 60 },
            zIndex: 10,
            label: '产品主体',
            isRequired: true,
            allowAI: false
          }
        ]
      }
    ]
  }
];
