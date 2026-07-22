export function getRatingInfo(rating: number = 1200) {
  if (rating >= 2200) {
    return { title: 'Grandmaster', colorClass: 'text-rating-legendary', bgClass: 'bg-red-500/10 text-red-400 border-red-500/30' };
  } else if (rating >= 1900) {
    return { title: 'Master', colorClass: 'text-rating-orange', bgClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
  } else if (rating >= 1600) {
    return { title: 'Candidate Master', colorClass: 'text-rating-purple', bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
  } else if (rating >= 1400) {
    return { title: 'Specialist', colorClass: 'text-rating-blue', bgClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
  } else if (rating >= 1200) {
    return { title: 'Apprentice', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  } else {
    return { title: 'Newbie', colorClass: 'text-rating-gray', bgClass: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
  }
}
