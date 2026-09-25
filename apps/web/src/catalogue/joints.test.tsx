import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JointLibrary } from './JointLibrary';

describe('joint reference library', () => {
  it('shows the three groups and lets the user select a group', () => {
    render(<JointLibrary />);
    const page = screen.getByRole('region', { name: 'หมวดรอยต่อ' });
    expect(within(page).getAllByRole('button', { name: /Standard Bay Joint|Node Joint|Base Joint/ })).toHaveLength(3);
    expect(screen.getByRole('img', { name: /J-S แผงคอนกรีตต่อกัน/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Node Joint/ }));
    expect(screen.getByRole('heading', { name: 'Node Joint' })).toBeInTheDocument();
    expect(screen.getByText(/ต้องแยกพิจารณาจากรอยต่อช่วงตรง/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /J-N Node Joint/ })).toBeInTheDocument();
  });

  it('filters to a base joint and exposes official website links', () => {
    render(<JointLibrary />);
    fireEvent.click(screen.getByRole('button', { name: 'ฐาน / ฐานราก' }));
    const selector = screen.getByRole('navigation', { name: 'เลือกกลุ่มรอยต่อ' });
    expect(within(selector).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Base Joint' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /รวมผลิตภัณฑ์ Precast/ })).toHaveAttribute('href', 'https://www.moment-solutions.com/products/precast-technologies/');
    expect(screen.getByRole('link', { name: /เว็บไซต์ตัวแทน/ })).toHaveAttribute('href', 'https://www.consinno.com/home');
  });
});
